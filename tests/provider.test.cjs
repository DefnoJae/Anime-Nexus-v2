const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../provider.js'),'utf8');
const id='00000000-0000-0000-0000-000000000001',episode2='00000000-0000-0000-0000-000000000002';
function load(fetch){return vm.runInNewContext(source+';new Provider()',{fetch});}
test('search uses only the site API and does not claim dub support',async()=>{
 const calls=[];const provider=load(async(url)=>{calls.push(url);return {ok:true,text:()=>JSON.stringify({data:[{id,name:'Frieren',slug:'frieren'}]})};});
 assert.equal((await provider.search({query:' Frieren ',dub:false}))[0].id,id);
 assert.equal(calls[0].startsWith('https://api.anime.nexus/api/anime/shows?'),true);
 assert.equal((await provider.search({query:'Frieren',dub:true})).length,0);assert.equal(calls.length,1);
});
test('episode pagination preserves gaps, removes duplicate UUIDs and skips fractional episodes',async()=>{
 let calls=0;const provider=load(async()=>({ok:true,json:()=>({data:++calls===1?[{id:episode2,number:3,slug:'three'},{id,number:1,slug:'one'}]:[{id,number:1,slug:'one'},{id:episode2,number:2.5,slug:'special'}],meta:{current_page:calls,last_page:2}})}));
 const result=await provider.findEpisodes(id);assert.deepEqual(Array.from(result,e=>e.number),[1,3]);assert.equal(calls,2);
});
test('challenge response never masquerades as a localhost outage',async()=>{
 const provider=load(async()=>({ok:false,status:403,text:()=>'<title>Just a moment</title>'}));
 await assert.rejects(provider.search({query:'Frieren'}),e=>e.code==='VERIFICATION_REQUIRED'&&!/localhost|127\.0\.0\.1/.test(e.message));
});
test('malformed pagination and missing playback implementation fail explicitly',async()=>{
 const provider=load(async()=>({ok:true,json:()=>({data:[],meta:{current_page:2,last_page:2}})}));
 await assert.rejects(provider.findEpisodes(id),/pagination/);
 await assert.rejects(provider.findEpisodeServer({id,url:'https://anime.nexus/watch/'+id+'/one'},'default'),/not implemented/);
 await assert.rejects(provider.findEpisodes('../bad'),/invalid ID/);
});
