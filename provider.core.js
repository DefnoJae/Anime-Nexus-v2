// Development preview. Direct catalogue access; playback support is not released.
class Provider {
    constructor() {this.site='https://anime.nexus';this.api='https://api.anime.nexus';}
    getSettings() {return {episodeServers:['Nexus HLS'],supportsDub:false};}
    uuid(value) {
        if(typeof value!=='string'||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value))throw new Error('Anime Nexus v2: invalid ID.');
        return value;
    }
    async catalogue(path) {
        if(!/^\/api\/anime\/(?:shows|details\/episodes)\?/.test(path))throw new Error('Anime Nexus v2: unsupported catalogue route.');
        const response=await fetch(this.api+path,{timeout:20});
        return SeanimeVerify.json(response,'nexus');
    }
    async search(opts) {
        if(!opts.query.trim()||opts.dub)return [];
        const result=await this.catalogue('/api/anime/shows?search='+encodeURIComponent(opts.query.trim())+'&sortBy=name%20asc&page=1&includes%5B%5D=poster&includes%5B%5D=genres&hasVideos=1');
        if(!Array.isArray(result.data))throw new Error('Anime Nexus v2: unexpected search response.');
        return result.data.filter(show=>show&&typeof show.name==='string'&&typeof show.slug==='string').map(show=>({id:this.uuid(show.id),title:show.name,url:this.site+'/series/'+show.id+'/'+encodeURIComponent(show.slug),subOrDub:'sub'}));
    }
    async findEpisodes(id) {
        this.uuid(id);
        const episodes=[],seen=new Set();
        for(let page=1;page<=1000;page++) {
            const result=await this.catalogue('/api/anime/details/episodes?id='+id+'&page='+page+'&perPage=24&order=asc&fillers=true&recaps=true');
            if(!Array.isArray(result.data)||!Number.isInteger(result.meta?.last_page)||result.meta.last_page<1||result.meta.current_page!==page)throw new Error('Anime Nexus v2: unexpected episode pagination.');
            for(const item of result.data) {
                if(!item||!Number.isInteger(Number(item.number))||Number(item.number)<1||typeof item.slug!=='string')continue;
                this.uuid(item.id);if(seen.has(item.id))continue;seen.add(item.id);
                episodes.push({id:item.id,number:Number(item.number),title:item.title||'Episode '+item.number,url:this.site+'/watch/'+item.id+'/'+encodeURIComponent(item.slug)});
            }
            if(page>=result.meta.last_page)return episodes.sort((a,b)=>a.number-b.number);
        }
        throw new Error('Anime Nexus v2: pagination limit exceeded.');
    }
    async findEpisodeServer(episode,server) {
        this.uuid(episode.id);
        if(!episode.url?.startsWith(this.site+'/watch/'+episode.id+'/'))throw new Error('Anime Nexus v2: invalid watch URL.');
        if(server!=='default'&&server!=='Nexus HLS')throw new Error('Anime Nexus v2: unknown server.');
        throw new Error('Anime Nexus v2 is a development preview. Native playback authorization and segment delivery are not implemented. Seanime Verify detects challenges but does not make this episode playable.');
    }
}
