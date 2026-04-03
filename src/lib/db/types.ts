/**
 * Re-export Prisma generated types with clean names.
 * This file exists outside the generated directory so it survives `prisma generate`.
 */
export { PrismaClient } from "@/generated/prisma/client";
export * from "@/generated/prisma/enums";

export type { ListingModel as Listing } from "@/generated/prisma/models/Listing";
export type { UserModel as User } from "@/generated/prisma/models/User";
export type { ConversationModel as Conversation } from "@/generated/prisma/models/Conversation";
export type { MessageModel as Message } from "@/generated/prisma/models/Message";
export type { ShortlistModel as Shortlist } from "@/generated/prisma/models/Shortlist";
export type { ShortlistListingModel as ShortlistListing } from "@/generated/prisma/models/ShortlistListing";
export type { ShortlistMemberModel as ShortlistMember } from "@/generated/prisma/models/ShortlistMember";
export type { VoteModel as Vote } from "@/generated/prisma/models/Vote";
export type { CommentModel as Comment } from "@/generated/prisma/models/Comment";
export type { InviteModel as Invite } from "@/generated/prisma/models/Invite";
export type { ScrapeJobModel as ScrapeJob } from "@/generated/prisma/models/ScrapeJob";
