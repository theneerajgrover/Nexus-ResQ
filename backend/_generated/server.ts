import {
  queryGeneric,
  mutationGeneric,
  actionGeneric,
  GenericQueryCtx,
  GenericMutationCtx,
  GenericActionCtx,
} from "convex/server";
import { DataModel } from "./dataModel";

export type QueryCtx = GenericQueryCtx<DataModel>;
export type MutationCtx = GenericMutationCtx<DataModel>;
export type ActionCtx = GenericActionCtx<DataModel>;

export const query = (func: { args?: any; handler: (ctx: QueryCtx, args: any) => any }): any =>
  queryGeneric(func as any);

export const mutation = (func: { args?: any; handler: (ctx: MutationCtx, args: any) => any }): any =>
  mutationGeneric(func as any);

export const action = (func: { args?: any; handler: (ctx: ActionCtx, args: any) => any }): any =>
  actionGeneric(func as any);
