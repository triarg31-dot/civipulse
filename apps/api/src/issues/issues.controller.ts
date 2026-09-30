
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { createReadStream } from "node:fs";
import { CreateIssueDto } from "./dto/create-issue.dto.js";
import { UpdateIssueStatusDto } from "./dto/update-issue-status.dto.js";
import { IssuesService } from "./issues.service.js";

type UploadedImage = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

@Controller("issues")
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  // Create a new civic issue
  @Post()
  create(@Body() dto: CreateIssueDto) {
    return this.issuesService.create(dto);
  }

  // Upload a photo attachment to an existing issue
  @Post(":id/attachments")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
      },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              "Only JPEG, PNG, and WebP images are allowed.",
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  uploadAttachment(
    @Param("id") id: string,
    @UploadedFile() file: UploadedImage,
  ) {
    if (!file) {
      throw new BadRequestException("A photo file is required.");
    }

    return this.issuesService.uploadAttachment(id, file);
  }

  // Get a photo attached to an issue
  @Get(":id/attachments/:attachmentId")
  async getAttachment(
    @Param("id") id: string,
    @Param("attachmentId") attachmentId: string,
  ) {
    const attachment = await this.issuesService.getAttachmentFile(
      id,
      attachmentId,
    );

    return new StreamableFile(createReadStream(attachment.filePath), {
      type: attachment.contentType,
    });
  }

  // Get all reported issues
  @Get()
  findAll() {
    return this.issuesService.findAll();
  }

  // Get one issue by ID
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.issuesService.findOne(id);
  }

  // Update an issue's status
  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateIssueStatusDto,
  ) {
    return this.issuesService.updateStatus(id, dto);
  }
}