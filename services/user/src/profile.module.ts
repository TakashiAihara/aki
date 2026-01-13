import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { User } from '@domain/entities/user.entity';
import { OAuthLink } from '@domain/entities/oauth-link.entity';

// Repositories
import { USER_REPOSITORY } from '@domain/repositories/user.repository';
import { OAUTH_LINK_REPOSITORY } from '@domain/repositories/oauth-link.repository';
import { UserRepositoryImpl } from '@infrastructure/persistence/user.repository.impl';
import { OAuthLinkRepositoryImpl } from '@infrastructure/persistence/oauth-link.repository.impl';

// Application
import { ProfileService } from '@application/profile/profile.service';

// Presentation
import { ProfileController } from '@presentation/controllers/profile.controller';

// Import AuthModule for guards
import { AuthModule } from './auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, OAuthLink]),
    AuthModule,
  ],
  controllers: [ProfileController],
  providers: [
    ProfileService,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepositoryImpl,
    },
    {
      provide: OAUTH_LINK_REPOSITORY,
      useClass: OAuthLinkRepositoryImpl,
    },
  ],
  exports: [ProfileService],
})
export class ProfileModule {}
