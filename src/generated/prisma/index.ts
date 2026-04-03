export { PrismaClient } from "./client";
export * from "./enums";
export type * from "./models";

// Convenience type aliases matching model names
export type { ListingModel as Listing } from "./models/Listing";
export type { UserModel as User } from "./models/User";
export type { ConversationModel as Conversation } from "./models/Conversation";
export type { MessageModel as Message } from "./models/Message";
export type { ShortlistModel as Shortlist } from "./models/Shortlist";
export type { ShortlistListingModel as ShortlistListing } from "./models/ShortlistListing";
export type { ShortlistMemberModel as ShortlistMember } from "./models/ShortlistMember";
export type { VoteModel as Vote } from "./models/Vote";
export type { CommentModel as Comment } from "./models/Comment";
export type { InviteModel as Invite } from "./models/Invite";
export type { ScrapeJobModel as ScrapeJob } from "./models/ScrapeJob";
