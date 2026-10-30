import assert from "node:assert/strict";
import { test } from "node:test";
import { createEmployerPlanRequestSession } from "../../src/components/utils/employerPlanRequest.js";
import { createAdminEmployerPlanRequestSession } from "../../src/components/utils/adminEmployerPlanRequest.js";
const accountId="100000000000000000000001",requestId="10000000-0000-4000-8000-000000000001";
const target={type:"employer",accountId,direction:"downgrade"};
const data={success:true,accountId,currentPlan:"platinum",subscription:{accountId,role:"employer",plan:"platinum",status:"active"},allowedPlans:["free","bronze","silver"],previewToken:"synthetic",pendingRequest:null};
const applied={id:"audit",requestId,employerId:accountId,fromPlan:"platinum",toPlan:"silver",appliedPlan:"silver",status:"applied",actualEffectiveAt:"2026-10-30T12:00:00Z"};
function fixture(kind,overrides={}){
 let owner={actor:`${kind}:${accountId}`,token:"synthetic"};const posts=[],states=[];let ids=0;
 const client={CanceledError:Error,get:async()=>({data}),post:async(_url,body)=>{posts.push(body);return {data:{success:true,request:applied}};},...overrides};
 const session=(kind==="employer"?createEmployerPlanRequestSession:createAdminEmployerPlanRequestSession)({client,baseUrl:"http://synthetic.invalid",readOwner:()=>owner,makeId:()=>{ids++;return requestId;}});
 const update=value=>states.push(value);
 return {posts,states,ids:()=>ids,ownerChange:()=>{owner={...owner,token:"other"};},load:()=>kind==="employer"?session.load(update):session.load(target,update),
 send:(plan="silver")=>kind==="employer"?session.send(plan,update):session.send(target,{...states.at(-1),toPlan:plan},update),cancel:()=>session.cancel()};
}
for(const kind of ["employer","admin"])test(`${kind} immediate downgrade client protections`,async t=>{
 await t.test("applied outcome and intent-only payload",async()=>{const f=fixture(kind);await f.load();await f.send();assert.deepEqual(Object.keys(f.posts[0]).sort(),["previewToken","requestId","toPlan"]);assert.equal(f.states.at(-1).status,"recorded");assert.equal((f.states.at(-1).applied||f.states.at(-1).data.latestAction).appliedPlan,"silver");});
 await t.test("no higher-plan submission",async()=>{const f=fixture(kind);await f.load();await f.send("platinum");assert.equal(f.posts.length,0);});
 await t.test("uncertain retry retains UUID and locks changed intent",async()=>{let calls=0;const posts=[];const f=fixture(kind,{post:async(_url,body)=>{posts.push(body);if(!calls++)throw Error("lost ack");return {data:{success:true,request:applied}};}});await f.load();await f.send();assert.equal(f.states.at(-1).status,"unconfirmed");await f.send("bronze");assert.equal(posts.length,1);await f.load();await f.send();assert.equal(posts[0].requestId,posts[1].requestId);assert.equal(f.ids(),1);assert.equal(f.states.at(-1).status,"recorded");});
 await t.test("same-tick double click sends once",async()=>{let release,calls=0;const wait=new Promise(resolve=>{release=resolve;});const f=fixture(kind,{post:async()=>{calls++;await wait;return {data:{success:true,request:applied}};}});await f.load();const first=f.send();await f.send();release();await first;assert.equal(calls,1);});
 for(const operation of ["load","send"])await t.test(`late ${operation} response ignored after actor token changes`,async()=>{let release;const wait=new Promise(resolve=>{release=resolve;});const f=fixture(kind,operation==="load"?{get:async()=>{await wait;return {data};}}:{post:async()=>{await wait;return {data:{success:true,request:applied}};}});if(operation==="send")await f.load();const work=operation==="load"?f.load():f.send();const count=f.states.length;f.ownerChange();release();await work;assert.equal(f.states.length,count);});
 await t.test("wrong-owner or pending-only response cannot claim applied",async()=>{for(const request of [{...applied,employerId:"other"},{...applied,status:"pending"}]){const f=fixture(kind,{post:async()=>({data:{success:true,request}})});await f.load();await f.send();assert.equal(f.states.at(-1).status,"unconfirmed");}});
 await t.test("old pending history does not block a deliberate downgrade",async()=>{const f=fixture(kind,{get:async()=>({data:{...data,pendingRequest:{id:"legacy",employerId:accountId,fromPlan:"platinum",toPlan:"silver",status:"pending"}}})});await f.load();await f.send();assert.equal(f.posts.length,1);assert.equal(f.states.at(-1).status,"recorded");});
});
