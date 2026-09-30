import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { IssueStatus } from "../../generated/prisma/enums.js";

export class UpdateIssueStatusDto {
  @IsEnum(IssueStatus)
  status!: IssueStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
