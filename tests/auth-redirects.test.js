const {test} = require('node:test');
const assert = require('node:assert/strict');
const {authUrls, beginAuth, validateAuth} = require('../routes/auth/redirects');
test('Vercel authentication always returns to its HTTPS host despite localhost environment settings',()=>{
 const req={protocol:'http',get:()=> 'vadedcasino.vercel.app'};
 assert.deepEqual(authUrls(req,{VERCEL:'1',BASE_URL:'http://127.0.0.1:3001',FRONTEND_URL:'http://localhost:3001'}),{base:'https://vadedcasino.vercel.app',frontend:'https://vadedcasino.vercel.app'});
 assert.deepEqual(authUrls(req,{BASE_URL:'https://api.example.com/',FRONTEND_URL:'https://example.com/'}),{base:'https://api.example.com',frontend:'https://example.com'});
});
test('provider callback state is tied to the browser, expires, and cannot cross providers',()=>{
 const cookies={};let cleared=false;
 const res={cookie:(name,value,options)=>{cookies[name]=value;assert.equal(options.httpOnly,true)},clearCookie:()=>{cleared=true}};
 const state=beginAuth(res,'steam');
 assert.equal(validateAuth({cookies,query:{state}},res,'steam'),true);
 assert.equal(cleared,true);
 for(const req of [{cookies:{},query:{state}},{cookies,query:{state:'x'.repeat(48)}},{cookies,query:{state:[]}}])assert.equal(validateAuth(req,res,'steam'),false);
 assert.equal(validateAuth({cookies,query:{state}},res,'google'),false);
 const expired=require('jsonwebtoken').sign({state,provider:'steam'},process.env.JWT_SECRET||'secret',{expiresIn:-1});
 assert.equal(validateAuth({cookies:{oauth_steam:expired},query:{state}},res,'steam'),false);
});
