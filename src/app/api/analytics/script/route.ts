import { NextRequest, NextResponse } from 'next/server';

// AUDIT 2026-08-12 (P1): this fell back to '' , making collectEndpoint a RELATIVE url. Embedded
// on a client's own website — which is the entire point of this snippet — a relative path posts to
// the CLIENT's domain, not ours, so a deliverable we sell silently collected nothing. Fall back to
// the site url (which validate-env requires in production) and refuse to emit a broken snippet.
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');

export async function GET(request: NextRequest) {
  const siteId = request.nextUrl.searchParams.get('id');

  if (!siteId || !/^[a-zA-Z0-9_]{1,50}$/.test(siteId)) {
    return NextResponse.json({ error: 'Invalid site ID' }, { status: 400 });
  }

  if (!APP_URL || !/^https?:\/\//.test(APP_URL)) {
    console.error('[ANALYTICS] NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_SITE_URL not set — refusing to emit a snippet with a relative endpoint');
    return new NextResponse('/* StrataLanding analytics is not configured on this deployment. */', {
      status: 503,
      headers: { 'Content-Type': 'application/javascript' },
    });
  }

  const collectEndpoint = `${APP_URL}/api/analytics/collect`;

  const script = `(function(){
  var S="${siteId}",E="${collectEndpoint}",F=5000,K="sm_sid",U="sm_utm";
  var q=[],t=null;

  function uid(){return Date.now()+"-"+Math.random().toString(36).substr(2,9)}
  function sid(){if(!window.sessionStorage)return uid();var s=sessionStorage.getItem(K);if(!s){s=uid();sessionStorage.setItem(K,s)}return s}

  function utm(){
    if(!window.sessionStorage)return{};
    var s=sessionStorage.getItem(U);if(s)try{return JSON.parse(s)}catch(e){}
    var p=new URLSearchParams(location.search),u={};
    ["source","medium","campaign","term","content"].forEach(function(k){
      var v=p.get("utm_"+k);if(v)u["utm_"+k]=v;
    });
    if(Object.keys(u).length)sessionStorage.setItem(U,JSON.stringify(u));
    return u;
  }

  function dev(){var w=innerWidth;return w<768?"mobile":w<1024?"tablet":"desktop"}
  function br(){var a=navigator.userAgent;if(a.indexOf("Firefox")>-1)return"Firefox";if(a.indexOf("Edg")>-1)return"Edge";if(a.indexOf("Chrome")>-1)return"Chrome";if(a.indexOf("Safari")>-1)return"Safari";return"Other"}
  function os(){var a=navigator.userAgent;if(a.indexOf("Windows")>-1)return"Windows";if(a.indexOf("Mac")>-1)return"macOS";if(a.indexOf("Linux")>-1)return"Linux";if(a.indexOf("Android")>-1)return"Android";if(/iPhone|iPad/.test(a))return"iOS";return"Other"}

  var gLat=null,gLng=null;

  function evt(type,props){
    var u=utm();
    var e={session_id:sid(),event_type:type,url:location.pathname,referrer:document.referrer||undefined,
      utm_source:u.utm_source,utm_medium:u.utm_medium,utm_campaign:u.utm_campaign,utm_term:u.utm_term,utm_content:u.utm_content,
      props:props||{},device_type:dev(),browser:br(),os:os(),screen_width:screen.width,screen_height:screen.height};
    if(gLat!==null)e.geo_lat=gLat;
    if(gLng!==null)e.geo_lng=gLng;
    q.push(e);
    if(!t)t=setInterval(flush,F);
  }

  function flush(){
    if(!q.length)return;var b=q.splice(0);
    var p=JSON.stringify({site_id:S,events:b});
    if(navigator.sendBeacon){var ok=navigator.sendBeacon(E,new Blob([p],{type:"application/json"}));if(ok)return}
    fetch(E,{method:"POST",headers:{"Content-Type":"application/json"},body:p,keepalive:true}).catch(function(){});
  }

  // Auto pageview — wait for GPS if permission already granted, else fire immediately
  function firePageview(){evt("pageview");}
  if(navigator.permissions&&navigator.geolocation){
    navigator.permissions.query({name:"geolocation"}).then(function(r){
      if(r.state==="granted"){
        navigator.geolocation.getCurrentPosition(
          function(p){gLat=p.coords.latitude;gLng=p.coords.longitude;firePageview();},
          function(){firePageview();},
          {timeout:2000,maximumAge:300000}
        );
      } else {firePageview();}
    }).catch(function(){firePageview();});
  } else {firePageview();}

  // Scroll depth
  var scrolled={};
  function onScroll(){
    var h=document.documentElement,pct=Math.round((h.scrollTop/(h.scrollHeight-h.clientHeight))*100);
    [25,50,75,100].forEach(function(m){if(pct>=m&&!scrolled[m]){scrolled[m]=1;evt("scroll_depth",{depth:m})}});
  }
  window.addEventListener("scroll",onScroll,{passive:true});

  // Time on page
  var start=Date.now();
  function onLeave(){var s=Math.round((Date.now()-start)/1000);if(s>0)evt("time_on_page",{seconds:s});flush()}
  document.addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden")onLeave()});
  window.addEventListener("pagehide",onLeave);
})();`;

  return new NextResponse(script, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
