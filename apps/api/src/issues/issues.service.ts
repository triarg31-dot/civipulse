
import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { IssueStatus } from "../generated/prisma/enums.js";
import { PrismaService } from "../prisma.service.js";
import { CreateIssueDto } from "./dto/create-issue.dto.js";
import { UpdateIssueStatusDto } from "./dto/update-issue-status.dto.js";

type UploadedImage = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

@Injectable()
export class IssuesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateIssueDto) {
    const reporter = await this.prisma.user.upsert({
      where: {
        firebaseUid: "dev-user",
      },
      update: {},
      create: {
        firebaseUid: "dev-user",
        email: "dev@civipulse.local",
        displayName: "CiviPulse Developer",
        role: "CITIZEN",
      },
    });

    return this.prisma.issue.create({
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        latitude: dto.latitude,
        longitude: dto.longitude,
        address: dto.address,
        reporterId: reporter.id,
      },
    });
  }

  async uploadAttachment(id: string, file: UploadedImage) {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!issue) {
      throw new NotFoundException("Issue not found");
    }

    const extensionByType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };

    const extension = extensionByType[file.mimetype];

    if (!extension) {
      throw new NotFoundException("Unsupported image type");
    }

    const storageKey = `${randomUUID()}.${extension}`;
    const uploadDirectory = join(process.cwd(), "uploads");
    const filePath = join(uploadDirectory, storageKey);

    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(filePath, file.buffer);

    try {
      return await this.prisma.issueAttachment.create({
        data: {
          issueId: id,
          storageKey,
          fileName: file.originalname,
          contentType: file.mimetype,
        },
      });
    } catch (error) {
      await unlink(filePath).catch(() => undefined);
      throw error;
    }
  }

  async getAttachmentFile(issueId: string, attachmentId: string) {
    const attachment = await this.prisma.issueAttachment.findFirst({
      where: {
        id: attachmentId,
        issueId,
      },
      select: {
        storageKey: true,
        contentType: true,
      },
    });

    if (!attachment) {
      throw new NotFoundException("Attachment not found");
    }

    const filePath = join(process.cwd(), "uploads", attachment.storageKey);

    return {
      filePath,
      contentType: attachment.contentType,
    };
  }

  async findAll() {
    return this.prisma.issue.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findOne(id: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
      include: {
        attachments: true,
        comments: true,
        history: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!issue) {
      throw new NotFoundException("Issue not found");
    }

    return issue;
  }

  async updateStatus(id: string, dto: UpdateIssueStatusDto) {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
    });

    if (!issue) {
      throw new NotFoundException("Issue not found");
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.issue.update({
        where: { id },
        data: {
          status: dto.status,
          resolvedAt:
            dto.status === IssueStatus.RESOLVED
              ? new Date()
              : dto.status === IssueStatus.CLOSED
                ? issue.resolvedAt ?? new Date()
                : null,
        },
      });

      await tx.issueStatusHistory.create({
        data: {
          issueId: id,
          actorId: issue.reporterId,
          fromStatus: issue.status,
          toStatus: dto.status,
          note: dto.note,
        },
      });

      return updated;
    });
  }
}