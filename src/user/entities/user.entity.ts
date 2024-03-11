/* eslint-disable @typescript-eslint/no-unused-vars */
import { SupportMessage } from '../../support-message/entities/support-message.entity';
import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Role } from '../types/userRole.type';

@Index('email', ['email'], { unique: true })
@Entity({
  name: 'users',
})
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true, nullable: false })
  email: string;

  @Column({ type: 'varchar', select: false, nullable: false })
  password: string;

  @Column({
    type: 'varchar',
    default: Role.User.toString(),
  })
  role: string;

  @OneToMany(() => SupportMessage, (supportMessage) => supportMessage.user)
  supportMessages: SupportMessage[];
}
