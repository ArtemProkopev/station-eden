// apps/api/src/time/time.controller.ts
import { Controller, Get } from '@nestjs/common'

@Controller('api')
export class TimeController {
  @Get('time')
  getServerTime() {
    return { 
      timestamp: Date.now(),
      success: true 
    }
  }
}