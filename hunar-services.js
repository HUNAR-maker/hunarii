/* HUNAR Google OAuth hard-fix: force one PKCE browser flow and one production callback. */
(function(){
  try{
    if(!window.__HUNAR_OAUTH_PATCHED__ && window.supabase && typeof window.supabase.createClient==='function'){
      const originalCreateClient=window.supabase.createClient.bind(window.supabase);
      window.supabase.createClient=function(url,key,options){
        const authOptions=Object.assign({},options&&options.auth||{}, {persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce'});
        const client=originalCreateClient(url,key,Object.assign({},options||{},{auth:authOptions}));
        if(client&&client.auth&&typeof client.auth.signInWithOAuth==='function'){
          const originalSignIn=client.auth.signInWithOAuth.bind(client.auth);
          client.auth.signInWithOAuth=function(params){
            const next=Object.assign({},params||{});
            next.options=Object.assign({},params&&params.options||{}, {redirectTo:'https://hunar-maker.github.io/hunarii/'});
            delete next.options.skipBrowserRedirect;
            return originalSignIn(next);
          };
        }
        return client;
      };
      window.__HUNAR_OAUTH_PATCHED__=true;
    }
  }catch(e){console.warn('HUNAR OAuth patch could not initialize:',e);}
})();

/* Hunar Phase 1 data/service layer. UI remains vanilla JS and calls these services. */
(function(){
  const db=()=>window.supabaseClient;
  const user=()=>window.productionUser;
  const auth=()=>user()?.id||null;
  const requireAuth=()=>{if(!auth()) throw new Error('Please sign in to continue.'); return auth();};
  const clean=(v)=>v===undefined?null:v;
  async function q(promise){const r=await promise;if(r.error)throw r.error;return r.data;}
  const accounts={
    async me(){const id=requireAuth();return q(supabaseClient.from('accounts').select('id,role,full_name,email,phone,city,region,photo_url,bio,email_verified,phone_verified,verification_status,created_at,updated_at').eq('id',id).single());},
    async update(fields){const id=requireAuth();const allowed={full_name:fields.full_name,phone:fields.phone,city:fields.city,region:fields.region,photo_url:fields.photo_url,bio:fields.bio};return q(supabaseClient.from('accounts').update(Object.fromEntries(Object.entries(allowed).filter(([,v])=>v!==undefined))).eq('id',id).select().single());}
  };
  const freelancers={
    async public(){const [a,f,s,p]=await Promise.all([
      q(supabaseClient.from('public_accounts').select('id,role,full_name,city,region,photo_url,bio,verification_status,created_at').eq('role','freelancer')),
      q(supabaseClient.from('freelancer_profiles').select('*')),
      q(supabaseClient.from('services').select('*').eq('published',true)),
      q(supabaseClient.from('portfolios').select('*'))
    ]);return {accounts:a,profiles:f,services:s,portfolios:p};},
    async profile(){const id=requireAuth();return q(supabaseClient.from('freelancer_profiles').select('*').eq('account_id',id).single());},
    async updateProfile(fields){const id=requireAuth();return q(supabaseClient.from('freelancer_profiles').update(fields).eq('account_id',id).select().single());}
  };
  /* Full existing HUNAR service layer remains in the deployed index/system. */
  window.HunarData=window.HunarData||{};
})();