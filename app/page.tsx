"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase, isAdmin } from "@/lib/supabase";
import { Sparkles, Search, UserRound, MessageCircle, Bell, ShieldCheck, LogOut, Heart, Send, Menu, X, LockKeyhole, Plus, WandSparkles, Info } from "lucide-react";

type Profile = { id:string; user_id:string; code:string; display_name:string; bio:string|null; avatar_url:string|null; is_public:boolean; created_at:string };
type Notice = { id:string; body:string; created_at:string; read:boolean };
const supabase = (() => { try { return getSupabase(); } catch { return null; } })();

export default function Home() {
  const [session,setSession] = useState<any>(null);
  const [profile,setProfile] = useState<Profile|null>(null);
  const [profiles,setProfiles] = useState<Profile[]>([]);
  const [query,setQuery] = useState("");
  const [tab,setTab] = useState("discover");
  const [authMode,setAuthMode] = useState<"login"|"signup">("signup");
  const [email,setEmail] = useState(""); const [otp,setOtp] = useState(""); const [otpSent,setOtpSent] = useState(false);
  const [name,setName] = useState(""); const [bio,setBio] = useState("");
  const [notice,setNotice] = useState(""); const [busy,setBusy] = useState(false);
  const [aiInput,setAiInput] = useState(""); const [aiReply,setAiReply] = useState("");
  const [chatText,setChatText] = useState(""); const [chatMessages,setChatMessages] = useState<any[]>([]);
  const [recipient,setRecipient] = useState(""); const [message,setMessage] = useState("");
  const [notifications,setNotifications] = useState<Notice[]>([]);
  const [mobileOpen,setMobileOpen] = useState(false);

  async function load() {
    if (!supabase) return;
    const { data:{session:s} } = await supabase.auth.getSession(); setSession(s);
    if (!s?.user) { setProfile(null); return; }
    const { data:p } = await supabase.from("profiles").select("*").eq("user_id",s.user.id).maybeSingle();
    setProfile(p);
    const { data:list } = await supabase.from("profiles").select("*").eq("is_public",true).order("created_at",{ascending:false}).limit(60);
    setProfiles(list || []);
    const { data:n } = await supabase.from("notifications").select("*").eq("user_id",s.user.id).order("created_at",{ascending:false}).limit(30);
    setNotifications(n || []);
  }
  useEffect(() => { load(); if (!supabase) return; const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{ load(); }); return ()=>subscription.unsubscribe(); },[]);
  const filtered = useMemo(()=>profiles.filter(p => (p.display_name+" "+p.code+" "+(p.bio||"")).toLowerCase().includes(query.toLowerCase())),[profiles,query]);

  async function authenticate() {
    if (!supabase) return setNotice("Setup needed: connect Supabase using the README instructions.");
    setBusy(true); setNotice("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: authMode === "signup" }
    });
    if (error) setNotice(error.message);
    else { setOtpSent(true); setNotice("A login code has been sent to your email. Check your inbox."); }
    setBusy(false);
  }
  async function verifyEmailCode() {
    if (!supabase) return setNotice("Setup needed: connect Supabase using the README instructions.");
    setBusy(true); setNotice("");
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(), token: otp.trim(), type: "email"
    });
    if (error) { setNotice(error.message); setBusy(false); return; }
    if (authMode === "signup" && data.user) {
      const { data: existing } = await supabase.from("profiles").select("user_id").eq("user_id", data.user.id).maybeSingle();
      if (!existing) {
        const code = "ID" + Math.random().toString(36).slice(2,8).toUpperCase();
        const { error: profileError } = await supabase.from("profiles").insert({
          user_id: data.user.id, code, display_name: name || email.split("@")[0], bio, is_public: true
        });
        if (profileError) setNotice(profileError.message);
        else setNotice("Your IDLY account is ready!");
      } else setNotice("Welcome back!");
    } else setNotice("Welcome back!");
    setBusy(false);
    await load();
  }
  async function saveProfile() {
    if(!supabase || !session?.user) return;
    setBusy(true);
    const payload={display_name:name || profile?.display_name || "IDLY member",bio,is_public:true};
    const result=profile ? await supabase.from("profiles").update(payload).eq("user_id",session.user.id) : await supabase.from("profiles").insert({user_id:session.user.id,code:"ID"+Math.random().toString(36).slice(2,8).toUpperCase(),...payload});
    setNotice(result.error?.message || "Profile saved."); await load(); setBusy(false);
  }
  async function follow(target:string) {
    if(!supabase || !session?.user) return setNotice("Sign in to follow people.");
    const {error}=await supabase.from("follows").upsert({follower_id:session.user.id,following_id:target});
    setNotice(error?.message || "Follow request saved."); 
  }
  async function sendMessage() {
    if(!supabase || !session?.user || !recipient.trim() || !message.trim()) return;
    const {error}=await supabase.from("messages").insert({sender_id:session.user.id,recipient_code:recipient.trim().toUpperCase(),body:message.trim()});
    setNotice(error?.message || "Message sent if the recipient accepts messages."); setMessage("");
  }
  async function askAI(mode:"chat"|"profile") {
    setBusy(true); setAiReply("");
    try { const r=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode,message:aiInput,profile:{display_name:name||profile?.display_name,bio}})}); const d=await r.json(); setAiReply(d.reply || d.error || "No response."); }
    catch { setAiReply("Could not connect to IDLY AI."); }
    setBusy(false);
  }
  async function sendChat() {
    if(!chatText.trim()) return;
    const text=chatText; setChatMessages(v=>[...v,{role:"user",text}]); setChatText(""); setAiInput(text);
    setBusy(true);
    try { const r=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"chat",message:text})}); const d=await r.json(); setChatMessages(v=>[...v,{role:"assistant",text:d.reply||d.error||"No response."}]); }
    catch { setChatMessages(v=>[...v,{role:"assistant",text:"AI is unavailable right now."}]); }
    setBusy(false);
  }
  const admin = isAdmin(session?.user?.email);
  const nav=[["discover","Discover",Search],["profile","My profile",UserRound],["messages","Messages",MessageCircle],["notifications","Notifications",Bell],["ai","IDLY AI",Sparkles],["about","About IDLY",Info],...(admin?[["admin","Admin",ShieldCheck] as any]:[])];
  if(!session) return <main className="authShell"><div className="authCard"><div className="brand"><span className="brandIcon">i</span><span>IDLY</span></div><p className="eyebrow">YOUR CODE. YOUR DETAILS.</p><h1>{authMode==="signup"?"Find your space.":"Welcome back."}</h1><p className="muted">A profile community built around consent, connection and helpful AI.</p>
    {authMode==="signup" && !otpSent && <input placeholder="Your display name" value={name} onChange={e=>setName(e.target.value)}/>}
    <input type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} disabled={otpSent}/>
    {otpSent && <input inputMode="numeric" autoComplete="one-time-code" placeholder="Enter the email code" value={otp} onChange={e=>setOtp(e.target.value)}/>}
    {!otpSent ? <button className="primary full" disabled={busy||!email.includes("@")||(authMode==="signup"&&!name.trim())} onClick={authenticate}>{busy?"Please wait…": "Send email code"}</button> : <><button className="primary full" disabled={busy||otp.trim().length<6} onClick={verifyEmailCode}>{busy?"Verifying…":"Verify code and continue"}</button><button className="link" onClick={()=>{setOtpSent(false);setOtp("");setNotice("");}}>Change email / resend code</button></>}
    <p className="switch">{authMode==="signup"?"Already have an account?":"New to IDLY?"} <button className="link" onClick={()=>{setAuthMode(authMode==="signup"?"login":"signup");setOtpSent(false);setOtp("");setNotice("");}}>{authMode==="signup"?"Sign in":"Create account"}</button></p>
    <p className="tiny"><LockKeyhole size={13}/> Password-free sign-in. Never share your email verification code with anyone.</p><p className="tiny">IDLY — Developed by Yafi and Team.</p>{notice&&<p className="notice">{notice}</p>}</div><div className="authAside"><div className="orb"></div><p className="eyebrow">MEET THE NEXT YOU</p><h2>Your people.<br/>Your profile.<br/><span>Your IDLY.</span></h2><p>One unique code makes your public profile easy to find — only the details you choose to share.</p><div className="floatingTag"><Sparkles size={16}/> AI-powered profile help</div></div></main>;

  return <main className="appShell"><aside className={mobileOpen?"sidebar open":"sidebar"}><div className="brand"><span className="brandIcon">i</span>IDLY</div><div className="sideLabel">WORKSPACE</div>{nav.map(([id,label,Icon]:any)=><button key={id} className={tab===id?"navItem active":"navItem"} onClick={()=>{setTab(id);setMobileOpen(false)}}><Icon size={18}/>{label}{id==="notifications"&&notifications.some(n=>!n.read)&&<i/>}</button>)}<div className="sideBottom"><div className="miniProfile"><div className="avatar">{(profile?.display_name||email||"I")[0].toUpperCase()}</div><div><b>{profile?.display_name||session.user.email}</b><small>{profile?.code||"Create your profile"}</small></div></div><button className="navItem" onClick={async()=>{await supabase?.auth.signOut();setSession(null)}}><LogOut size={18}/>Sign out</button></div></aside>
  <section className="mainArea"><header className="topbar"><button className="iconBtn mobileMenu" onClick={()=>setMobileOpen(!mobileOpen)}>{mobileOpen?<X/>:<Menu/>}</button><div><span className="eyebrow">IDLY COMMUNITY</span><h2>{nav.find((n:any)=>n[0]===tab)?.[1]||"Dashboard"}</h2></div><div className="topActions"><span className="onlineDot"/> <span className="muted">You're in control</span><div className="avatar small">{(profile?.display_name||"I")[0].toUpperCase()}</div></div></header>
  {notice&&<div className="noticeBar">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
  {tab==="discover"&&<div className="content"><div className="hero"><div><span className="eyebrow">YOUR COMMUNITY, YOUR WAY</span><h1>Make meaningful<br/><span>connections.</span></h1><p>Discover public profiles using names or unique IDLY codes.</p></div><div className="heroArt"><div className="heroRing"><UserRound size={56}/></div><span className="artPill">IDLY / CONNECT</span></div></div><div className="sectionHead"><div><h3>Discover people</h3><p className="muted">Search by display name or unique code</p></div><div className="searchBox"><Search size={18}/><input placeholder="Try an IDLY code…" value={query} onChange={e=>setQuery(e.target.value)}/></div></div><div className="profileGrid">{filtered.map(p=><article className="profileCard" key={p.id}><div className="cardTop"><div className="avatar large">{p.display_name[0]?.toUpperCase()}</div><span className="codeTag">{p.code}</span></div><h3>{p.display_name}</h3><p>{p.bio||"This member hasn't added a bio yet."}</p><div className="cardFoot"><span className="publicTag"><span/> Public profile</span><button className="outline smallBtn" onClick={()=>follow(p.user_id)}><Plus size={15}/> Follow</button></div></article>)}{filtered.length===0&&<div className="empty">No public profiles found. Try another name or code.</div>}</div></div>}
  {tab==="profile"&&<div className="content narrow"><div className="panel"><span className="eyebrow">YOUR IDLY IDENTITY</span><h1>Build your profile</h1><p className="muted">Share only what you're comfortable making public.</p><label>Display name</label><input value={name||profile?.display_name||""} onChange={e=>setName(e.target.value)} placeholder="How should people know you?"/><label>About you</label><textarea value={bio||profile?.bio||""} onChange={e=>setBio(e.target.value)} placeholder="Write a short introduction…" rows={5}/><div className="codeHighlight"><span>Your unique IDLY code</span><b>{profile?.code||"Created when you save"}</b></div><button className="primary" disabled={busy} onClick={saveProfile}>Save profile</button></div><div className="panel aiPanel"><WandSparkles/><div><h3>Need help with your bio?</h3><p className="muted">Ask the AI Profile Assistant for a fresh draft.</p></div><textarea placeholder="e.g. Make my bio friendly and creative…" value={aiInput} onChange={e=>setAiInput(e.target.value)}/><button className="primary" disabled={busy||!aiInput.trim()} onClick={()=>askAI("profile")}>Generate suggestions</button>{aiReply&&<div className="aiReply">{aiReply}</div>}</div></div>}
  {tab==="messages"&&<div className="content narrow"><div className="panel"><span className="eyebrow">PRIVATE CONVERSATIONS</span><h1>Send a message</h1><p className="muted">Messages are intended for people you follow. Delivery is subject to the recipient's privacy settings.</p><label>Recipient's IDLY code</label><input value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="IDLY code"/><label>Your message</label><textarea rows={5} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Write something kind…"/><button className="primary" onClick={sendMessage}><Send size={16}/> Send message</button><p className="tiny">Message requests and blocking controls can be managed from account privacy settings.</p></div></div>}
  {tab==="notifications"&&<div className="content narrow"><div className="panel"><h1>Notifications</h1>{notifications.length?notifications.map(n=><div className="notification" key={n.id}><Bell size={18}/><div>{n.body}<small>{new Date(n.created_at).toLocaleString()}</small></div></div>):<div className="empty">You're all caught up.</div>}</div></div>}
  {tab==="ai"&&<div className="content narrow"><div className="panel chatPanel"><div className="aiHeading"><div className="aiIcon"><Sparkles/></div><div><span className="eyebrow">YOUR IDLY ASSISTANT</span><h1>Ask IDLY AI</h1><p className="muted">Ideas, questions and helpful guidance.</p></div></div><div className="chatHistory">{chatMessages.length===0&&<div className="welcomeAI"><Sparkles size={28}/><h3>What can I help you with?</h3><p>Ask a question or get ideas for your profile.</p><p className="tiny" style={{justifyContent:"center"}}>IDLY AI — developed by Yafi and Team.</p></div>}{chatMessages.map((m,i)=><div key={i} className={"bubble "+m.role}>{m.text}</div>)}</div><div className="chatComposer"><input value={chatText} onChange={e=>setChatText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Message IDLY AI…"/><button className="primary sendBtn" disabled={busy||!chatText.trim()} onClick={sendChat}><Send size={17}/></button></div><p className="tiny">AI responses can be inaccurate. Don't enter passwords, private messages or sensitive personal information.</p></div></div>}
  {tab==="about"&&<div className="content narrow"><div className="panel"><span className="eyebrow">THE STORY BEHIND IDLY</span><h1>About IDLY</h1><p className="muted">IDLY is a community built around meaningful connections, personal profiles, and helpful AI.</p><div className="codeHighlight"><span>Created and developed by</span><b>Yafi and Team</b></div><p className="muted">Thank you for being part of the IDLY community.</p></div></div>}
  {tab==="admin"&&admin&&<div className="content"><div className="panel"><span className="eyebrow">RESTRICTED AREA</span><h1>Admin dashboard</h1><p className="muted">Admin access is controlled by the server-side ADMIN_EMAILS setting. Review public profiles and manage reports from the Supabase dashboard.</p><div className="stats"><div><b>{profiles.length}</b><span>Loaded public profiles</span></div><div><b>{notifications.length}</b><span>Your notifications</span></div></div></div></div>}
  <footer>© {new Date().getFullYear()} IDLY <span>•</span> Your Code. Your Details.</footer></section></main>;
}