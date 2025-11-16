CREATE TABLE "auth_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"provider" varchar(255) NOT NULL,
	"type" varchar(255) NOT NULL,
	"providerAccountId" varchar(255) NOT NULL,
	"access_token" text,
	"expires_at" integer,
	"refresh_token" text,
	"id_token" text,
	"scope" text,
	"session_state" text,
	"token_type" varchar(255),
	"password" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"expires" timestamp NOT NULL,
	"sessionToken" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "auth_sessions_sessionToken_unique" UNIQUE("sessionToken")
);
--> statement-breakpoint
CREATE TABLE "auth_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"emailVerified" timestamp,
	"image" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "auth_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_verification_token" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "auth_verification_token_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "photo_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"prompt" text NOT NULL,
	"photo_count" integer NOT NULL,
	"cost" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"download_url" text,
	"group_name" varchar(140),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"stripe_session_id" varchar(255) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"credits_purchased" numeric(10, 2) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "purchases_stripe_session_id_unique" UNIQUE("stripe_session_id")
);
--> statement-breakpoint
CREATE TABLE "user_credits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"credits" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"free_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_credits_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_userId_auth_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_auth_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_jobs" ADD CONSTRAINT "photo_jobs_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credits" ADD CONSTRAINT "user_credits_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_auth_accounts_user_id" ON "auth_accounts" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_auth_accounts_provider_account" ON "auth_accounts" USING btree ("providerAccountId","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_accounts_provider_account_unique" ON "auth_accounts" USING btree ("providerAccountId","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_auth_sessions_token" ON "auth_sessions" USING btree ("sessionToken");--> statement-breakpoint
CREATE INDEX "idx_auth_sessions_user_id" ON "auth_sessions" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_auth_users_email" ON "auth_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_auth_users_id" ON "auth_users" USING btree ("id");--> statement-breakpoint
CREATE INDEX "idx_auth_verification_token" ON "auth_verification_token" USING btree ("identifier","token");--> statement-breakpoint
CREATE INDEX "idx_photo_jobs_user_id" ON "photo_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_photo_jobs_status" ON "photo_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_photo_jobs_created_at" ON "photo_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_purchases_stripe_session" ON "purchases" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE INDEX "idx_purchases_user_id" ON "purchases" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_credits_user_id" ON "user_credits" USING btree ("user_id");