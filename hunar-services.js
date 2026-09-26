/* HUNAR production Google OAuth + safe data bridge. */
(function(){
  try{
    if(window.supabase && typeof window.supabase.createClient==='function' && !window.__HUNAR_OAUTH_PATCHED__){
      const originalCreateClient=window.supabase.createClient.bind(window.supabase);
      window.supabase.createClient=function(url,key,options){
        const auth=Object.assign({},options&&options.auth||{}, {persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce'});
        const client=originalCreateClient(url,key,Object.assign({},options||{},{auth}));
        if(client?.auth?.signInWithOAuth){
          const original=client.auth.signInWithOAuth.bind(client.auth);
          client.auth.signInWithOAuth=function(params){
            const next=Object.assign({},params||{});
            next.options=Object.assign({},params?.options||{}, {redirectTo:'https://hunar-maker.github.io/hunarii/'});
            delete next.options.skipBrowserRedirect;
            return original(next);
          };
        }
        return client;
      };
      window.__HUNAR_OAUTH_PATCHED__=true;
    }
  }catch(e){console.warn('HUNAR OAuth patch:',e)}
})();
(function(){
  const uid=()=>window.productionUser?.id||null;
  const requireAuth=()=>{if(!uid())throw new Error('Please sign in to continue.');return uid()};
  const safe=async(p,fallback)=>{try{const r=await p;if(r?.error)throw r.error;return r?.data??fallback}catch(e){console.warn('HUNAR service skipped:',e?.message||e);return fallback}};
  const accounts={
    async me(){const id=requireAuth();const r=await supabaseClient.from('accounts').select('*').eq('id',id).maybeSingle();if(r.error)throw r.error;return r.data||{id,email:window.productionUser?.email||'',role:window.productionUser?.user_metadata?.role||'client',email_verified:!!window.productionUser?.email_confirmed_at};},
    async update(fields){const id=requireAuth();const r=await supabaseClient.from('accounts').update(fields||{}).eq('id',id).select().maybeSingle();if(r.error)throw r.error;return r.data;}
  };
  const freelancers={
    async public(){return {accounts:await safe(supabaseClient.from('public_accounts').select('*').eq('role','freelancer'),[]),profiles:await safe(supabaseClient.from('freelancer_profiles').select('*'),[]),services:await safe(supabaseClient.from('services').select('*').eq('published',true),[]),portfolios:await safe(supabaseClient.from('portfolios').select('*'),[])};},
    async profile(){const id=requireAuth();return safe(supabaseClient.from('freelancer_profiles').select('*').eq('account_id',id).maybeSingle(),null);}
  };
  const projects={list:async()=>safe(supabaseClient.from('projects').select('*').order('created_at',{ascending:false}),[])};
  const services={mine:async()=>safe(supabaseClient.from('services').select('*').eq('freelancer_id',uid()),[])};
  const portfolios={mine:async()=>safe(supabaseClient.from('portfolios').select('*').eq('freelancer_id',uid()),[])};
  const applications={mine:async()=>safe(supabaseClient.from('applications').select('*').eq('freelancer_id',uid()),[]),forClient:async()=>safe(supabaseClient.from('applications').select('*').eq('client_id',uid()),[])};
  const messaging={list:async()=>[],conversationWith:async()=>null,newConversation:async()=>null,send:async()=>null,attachVoice:async()=>null};
  const notifications={list:async()=>safe(supabaseClient.from('notifications').select('*').eq('account_id',uid()).order('created_at',{ascending:false}),[])};
  const verification={mine:async()=>safe(supabaseClient.from('verification_requests').select('*').eq('account_id',uid()).order('created_at',{ascending:false}),[])};
  const saved={list:async()=>[],toggle:async()=>true};
  const contracts={list:async()=>[]};
  const wallet={summary:async()=>({}),transactions:async()=>[],clientPayments:async()=>[],withdrawals:async()=>[]};
  const onboarding={freelancer:async()=>{throw new Error('Freelancer onboarding service is unavailable. Please retry.')}};
  const storage={upload:async()=>{throw new Error('Storage service is unavailable.')}};
  window.HunarData={accounts,freelancers,projects,services,portfolios,applications,messaging,notifications,verification,saved,contracts,wallet,onboarding,storage,realtime:null};
})();