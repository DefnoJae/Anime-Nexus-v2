const fs=require('node:fs'),path=require('node:path');
if(process.argv[2])fs.copyFileSync(path.resolve(process.argv[2],'src/verify.js'),path.join(__dirname,'vendor/verify.js'));
const payload=['vendor/verify.js','provider.core.js'].map(file=>fs.readFileSync(path.join(__dirname,file),'utf8')).join('\n\n');
fs.writeFileSync(path.join(__dirname,'provider.js'),payload);
const base='https://raw.githubusercontent.com/DefnoJae/Anime-Nexus-v2/main/';
fs.writeFileSync(path.join(__dirname,'Manifest.json'),JSON.stringify({id:'animenexusv2',name:'Anime Nexus v2 (Development Preview)',version:'0.0.1',type:'onlinestream-provider',language:'javascript',author:'DefnoJae',lang:'multi',description:'Development preview: direct catalogue and verification detection. Episode playback is not implemented.',notes:'Not a playback release. Direct catalogue requests can still require site verification. Keep the original Anime Nexus provider for its existing helper-based integration.',manifestURI:base+'Manifest.json',readme:base+'README.md',website:'https://anime.nexus/',payload},null,2)+'\n');
