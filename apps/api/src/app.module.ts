import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma.module.js";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { IssuesModule } from "./issues/issues.module.js";

@Module({
  imports: [PrismaModule, IssuesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
