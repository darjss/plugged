import * as v from "valibot";

export const adminUsersQuerySchema = v.object({
  search: v.optional(v.pipe(v.string(), v.minLength(1))),
});

export const adminUpdateUserSchema = v.object({
  isAdmin: v.boolean(),
});
