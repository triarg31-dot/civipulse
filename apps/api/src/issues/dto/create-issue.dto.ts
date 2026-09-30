import { IsIn, IsNumber, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

const categories = [
  "roads",
  "streetlights",
  "waste",
  "water",
  "public-spaces",
  "other",
] as const;

export class CreateIssueDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description!: string;

  @IsString()
  @IsIn(categories)
  category!: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;
}
