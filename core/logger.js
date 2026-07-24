const fs=require('fs'),path=require('path');
const D=path.join(__dirname,'..','logs');
if(!fs.existsSync(D))fs.mkdirSync(D,{recursive:true});
function log(sis='GERAL',tit='',desc='',usr='Sistema',tipo='INFO'){
  const a=new Date(),ds=a.toISOString().replace('T',' ').slice(0,19);
  fs.appendFileSync(path.join(D,a.toISOString().slice(0,10)+'.log'),`[${ds}] [${tipo}] [${sis}] ${tit}${desc?' | '+String(desc).slice(0,300):''} | ${usr}\n`);
  const ic={ERRO:'❌',SUCESSO:'✅',AVISO:'⚠️',INFO:'ℹ️'}[tipo]||'•';
  console.log(`\x1b[90m[${ds}]\x1b[0m \x1b[36m[${sis.toUpperCase()}]\x1b[0m ${ic} ${tit}${desc?` \x1b[90m— ${String(desc).slice(0,80)}\x1b[0m`:''}`);
  try{require('./database').run('INSERT INTO logs(sistema,tipo,titulo,descricao,usuario)VALUES(?,?,?,?,?)',[sis,tipo,tit,String(desc).slice(0,500),usr]).catch(()=>{})}catch(e){}
}
module.exports={log};
