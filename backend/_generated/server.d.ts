import { GenericQueryCtx, GenericMutationCtx, GenericActionCtx } from "convex/server";
import { DataModel } from "./dataModel";

export type QueryCtx = GenericQueryCtx<DataModel>;
export type MutationCtx = GenericMutationCtx<DataModel>;
export type ActionCtx = GenericActionCtx<DataModel>;

export declare const query: (
  func: { args?: any; handler: (ctx: QueryCtx, args: any) => any }
) => any;

export declare const mutation: (
  func: { args?: any; handler: (ctx: MutationCtx, args: any) => any }
) => any;

export declare const action: (
  func: { args?: any; handler: (ctx: ActionCtx, args: any) => any }
) => any;
