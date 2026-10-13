// Shared provider code, bundled at build time. No remote code execution or service.
class SeanimeVerify {
    static site(id) {
        const sites = {
            mkissa: { name: 'MKissa', url: 'https://mkissa.to/anime' },
            nexus: { name: 'Anime Nexus', url: 'https://anime.nexus/' }
        };
        if (!Object.prototype.hasOwnProperty.call(sites, id)) throw new Error('Unsupported verification provider');
        return sites[id];
    }
    static required(id) {
        const site = this.site(id);
        const error = new Error(site.name + ': site verification is required. Open ' + site.url +
            ' and complete any verification the site presents, then retry in Seanime. Browser verification may not authorize Seanime requests.');
        error.code = 'VERIFICATION_REQUIRED';
        error.provider = id;
        return error;
    }
    static isChallenge(text) {
        return typeof text === 'string' && /__CF\$cv\$params|\/cdn-cgi\/challenge-platform\/|cf-chl-|<title>\s*Just a moment/i.test(text);
    }
    static needsVerification(data) {
        const codes = ['NEED_CAPTCHA', 'TURNSTILE_REQUIRED', 'TURNSTILE_FAILED', 'FALLBACK_REQUIRED', 'ALTCHA_REQUIRED', 'VERIFICATION_REQUIRED'];
        if (!data || typeof data !== 'object') return false;
        if (codes.includes(data.code)) return true;
        return Array.isArray(data.errors) && data.errors.some(error => error &&
            (codes.includes(error.code) || codes.includes(error.extensions && error.extensions.code) ||
             (typeof error.message === 'string' && /\b(?:NEED_CAPTCHA|TURNSTILE_REQUIRED|VERIFICATION_REQUIRED)\b/.test(error.message))));
    }
    static apiError(data, id) {
        if (this.needsVerification(data)) return this.required(id);
        const site = this.site(id);
        const stale = data && Array.isArray(data.errors) && data.errors.some(error =>
            error && typeof error.message === 'string' && /\bAA_CRYPTO_(?:STALE|EXPIRED|BUILD_MISMATCH)\b/.test(error.message));
        const error = new Error(site.name + ': ' + (stale ? 'AA_CRYPTO_STALE; signing must be refreshed.' : 'upstream API rejected the request.'));
        error.code = stale ? 'SIGNING_STALE' : 'UPSTREAM_API_ERROR';
        return error;
    }
    static async assertResponse(response, id) {
        if (response.ok) return;
        let text = '';
        try { if (typeof response.text === 'function') text = await response.text(); } catch (_) {}
        let data;
        try { data = JSON.parse(text); } catch (_) {}
        if (this.isChallenge(text) || this.needsVerification(data)) throw this.required(id);
        const error = new Error(this.site(id).name + ': request failed (HTTP ' + response.status + ').');
        error.code = 'UPSTREAM_HTTP_ERROR';
        throw error;
    }
    static async json(response, id) {
        await this.assertResponse(response, id);
        let data;
        if (typeof response.text === 'function') {
            const text = await response.text();
            if (this.isChallenge(text)) throw this.required(id);
            try { data = JSON.parse(text); } catch (_) { throw new Error(this.site(id).name + ': upstream returned invalid JSON.'); }
        } else {
            try { data = await response.json(); } catch (_) { throw new Error(this.site(id).name + ': upstream returned invalid JSON.'); }
        }
        if (this.needsVerification(data)) throw this.required(id);
        return data;
    }
}


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
