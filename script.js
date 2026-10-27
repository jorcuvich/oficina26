(function(){
"use strict";

/* ============ estado e persistência ============ */
var CHAVE = "oficina-impacto-v1";
var PADRAO = {
  passos:{}, ods:[], entrega:{}, teste:{},
  canvas:{
    nome:"Mural de Ações do Bairro",
    problema:"Ações de limpeza e doação acontecem no bairro, mas ninguém registra, então nada é cobrado nem tem continuidade.",
    quem:"Moradores da Vila Nova que organizam mutirões por conta própria e nunca sabem o que já foi feito.",
    onde:"Vila Nova, entre a Rua das Palmeiras e a praça central.",
    faz:"Registra cada ação realizada no bairro com responsável, local e data, e mostra tudo num mural público.",
    usuario:"Moradores, a associação de bairro e os alunos que organizam mutirões.",
    ganho:"O trabalho dela fica visível e ela consegue mostrar para a prefeitura o que já foi feito.",
    continua:"A associação de moradores fica com a senha e alimenta o mural. O site é gratuito, não tem custo mensal.",
    financiamento:"Não precisa de dinheiro para funcionar: a hospedagem é gratuita no GitHub Pages e quem alimenta é a própria associação. Se um dia quisermos um endereço próprio, custa cerca de 40 reais por ano, e a associação já disse que paga.",
    indicador:"número de ações cadastradas por moradores diferentes em 4 semanas"
  },
  campos:[
    {rotulo:"Título da ação", tipo:"texto"},
    {rotulo:"Categoria", tipo:"lista", opcoes:"Ambiental, Social, Educação, Saúde"},
    {rotulo:"Local", tipo:"texto"},
    {rotulo:"Quantas pessoas participaram", tipo:"numero"},
    {rotulo:"O que foi feito", tipo:"longo"}
  ]
};
var REGISTRO_PADRAO = {
  equipe:"", turma:"",
  inicio:"", fim:"", dias:[],
  copias:{}, copiasEm:{},
  passosEm:{},
  zip:0, zipEm:[],
  socorro:{}
};
PADRAO.registro = JSON.parse(JSON.stringify(REGISTRO_PADRAO));

var E = JSON.parse(JSON.stringify(PADRAO));

function carregar(){
  try{
    var bruto = localStorage.getItem(CHAVE);
    if(!bruto) return;
    var salvo = JSON.parse(bruto);
    if(salvo && typeof salvo === "object"){
      E.passos  = salvo.passos  || {};
      E.entrega = salvo.entrega || {};
      E.teste   = salvo.teste   || {};
      E.ods     = Array.isArray(salvo.ods) ? salvo.ods : [];
      if(salvo.canvas) for(var k in salvo.canvas) E.canvas[k] = salvo.canvas[k];
      if(Array.isArray(salvo.campos) && salvo.campos.length) E.campos = salvo.campos;
      if(salvo.registro && typeof salvo.registro === "object"){
        for(var r in REGISTRO_PADRAO){
          if(salvo.registro[r] !== undefined) E.registro[r] = salvo.registro[r];
        }
      }
    }
  }catch(e){ /* navegador sem storage: segue com o exemplo */ }
}

/* ============ registro de uso ============
   Conta o que o aluno faz na página, para que o professor possa exportar
   depois. Nada sai do navegador sozinho: só o botão de exportar gera arquivo. */
function reg(){
  if(!E.registro || typeof E.registro !== "object"){
    E.registro = JSON.parse(JSON.stringify(REGISTRO_PADRAO));
  }
  return E.registro;
}
function agora(){ return new Date().toISOString(); }
function toque(){
  var r = reg(), t = agora(), dia = t.slice(0,10);
  if(!r.inicio) r.inicio = t;
  r.fim = t;
  if(!Array.isArray(r.dias)) r.dias = [];
  if(r.dias.indexOf(dia) === -1) r.dias.push(dia);
}
function contar(grupo, chave, comData){
  var r = reg();
  if(!r[grupo] || typeof r[grupo] !== "object") r[grupo] = {};
  r[grupo][chave] = (r[grupo][chave] || 0) + 1;
  if(comData){
    if(!r[comData] || typeof r[comData] !== "object") r[comData] = {};
    if(!Array.isArray(r[comData][chave])) r[comData][chave] = [];
    if(r[comData][chave].length < 200) r[comData][chave].push(agora());
  }
  salvar();
}

function salvar(){
  try{
    toque();
    localStorage.setItem(CHAVE, JSON.stringify(E));
  }catch(e){}
}
carregar();
/* Grava já na abertura, para que a data do primeiro acesso e os dias de uso
   fiquem registrados mesmo que o aluno só leia a página e não clique em nada. */
salvar();

/* ============ utilidades ============ */
function $(s,c){ return (c||document).querySelector(s); }
function $$(s,c){ return Array.prototype.slice.call((c||document).querySelectorAll(s)); }
function slug(t){
  return String(t||"").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g,"")
    .replace(/[^a-z0-9]+/g," ").trim().split(" ")
    .map(function(p,i){ return i===0 ? p : p.charAt(0).toUpperCase()+p.slice(1); })
    .join("").slice(0,24) || "campo";
}
function idsDosCampos(){
  var usados = {};
  return E.campos.map(function(c){
    var base = slug(c.rotulo), id = base, n = 2;
    while(usados[id]){ id = base + n; n++; }
    usados[id] = true;
    return { id:id, rotulo:c.rotulo, tipo:c.tipo, opcoes:c.opcoes||"" };
  });
}
function opcoesDe(c){
  return String(c.opcoes||"").split(",").map(function(s){return s.trim();}).filter(Boolean);
}
function vazio(v, alt){ return (v && String(v).trim()) ? String(v).trim() : alt; }

/* O texto que o aluno digita entra dentro do codigo gerado.
   Sem tratar, uma aspa no nome de um campo quebra o script.js inteiro
   e uma aspa no Canvas quebra um atributo do HTML. Estas tres funcoes
   limpam cada caso. */
function escTexto(t){                 // vai para dentro de uma tag HTML
  return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function escAtrib(t){                 // vai para dentro de um atributo HTML
  return escTexto(t).replace(/"/g,"&quot;");
}
function escJs(t){                    // vai para dentro de um texto no JavaScript gerado
  return String(t).replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/[\r\n]+/g," ");
}

/* ============ ODS ============ */
var ODS = ["Erradicação da pobreza","Fome zero e agricultura sustentável","Saúde e bem-estar",
"Educação de qualidade","Igualdade de gênero","Água potável e saneamento","Energia limpa e acessível",
"Trabalho decente e crescimento econômico","Indústria, inovação e infraestrutura","Redução das desigualdades",
"Cidades e comunidades sustentáveis","Consumo e produção responsáveis","Ação contra a mudança global do clima",
"Vida na água","Vida terrestre","Paz, justiça e instituições eficazes","Parcerias e meios de implementação"];

function montarOds(){
  var caixa = $("#listaOds");
  caixa.innerHTML = "";
  ODS.forEach(function(nome, i){
    var n = i+1;
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-pressed", E.ods.indexOf(n) >= 0 ? "true" : "false");
    b.innerHTML = "<b>" + n + "</b>" + nome;
    b.addEventListener("click", function(){
      var pos = E.ods.indexOf(n);
      if(pos >= 0) E.ods.splice(pos,1);
      else { E.ods.push(n); if(E.ods.length > 2) E.ods.shift(); }
      salvar(); montarOds(); atualizarTextos();
    });
    caixa.appendChild(b);
  });
}
function textoOds(){
  if(!E.ods.length) return "ainda não escolhido";
  return E.ods.slice().sort(function(a,b){return a-b;})
    .map(function(n){ return "ODS " + n + " (" + ODS[n-1] + ")"; }).join(" e ");
}

/* ============ canvas ============ */
function montarCanvas(){
  $$("[data-canvas]").forEach(function(el){
    var chave = el.getAttribute("data-canvas");
    el.value = E.canvas[chave] || "";
    el.addEventListener("input", function(){
      E.canvas[chave] = el.value;
      salvar(); atualizarTextos();
      piscar($("#avisoCanvas"), "Salvo");
    });
  });
}
var timers = {};
function piscar(el, texto){
  if(!el) return;
  el.textContent = texto;
  clearTimeout(timers[el.id]);
  timers[el.id] = setTimeout(function(){ el.textContent = ""; }, 1600);
}

/* ============ campos do sistema ============ */
function montarCampos(){
  var caixa = $("#listaCampos");
  caixa.innerHTML = "";
  E.campos.forEach(function(c, i){
    var linha = document.createElement("div");
    linha.className = "linha-campo";

    var nome = document.createElement("input");
    nome.type = "text"; nome.value = c.rotulo; nome.maxLength = 40;
    nome.setAttribute("aria-label", "Nome do campo " + (i+1));
    nome.addEventListener("input", function(){ c.rotulo = nome.value; salvar(); atualizarTextos(); piscar($("#avisoCampos"),"Salvo"); });

    var tipo = document.createElement("select");
    tipo.setAttribute("aria-label", "Tipo do campo " + (i+1));
    [["texto","Texto curto"],["lista","Lista de opções"],["longo","Texto longo"],["numero","Número"]]
      .forEach(function(par){
        var o = document.createElement("option");
        o.value = par[0]; o.textContent = par[1];
        if(c.tipo === par[0]) o.selected = true;
        tipo.appendChild(o);
      });
    tipo.addEventListener("change", function(){ c.tipo = tipo.value; salvar(); montarCampos(); atualizarTextos(); });

    var extra = document.createElement("input");
    extra.type = "text";
    extra.placeholder = "Opções separadas por vírgula";
    extra.setAttribute("aria-label", "Opções do campo " + (i+1));
    extra.value = c.opcoes || "";
    if(c.tipo !== "lista"){ extra.disabled = true; extra.placeholder = "só para lista de opções"; }
    extra.addEventListener("input", function(){ c.opcoes = extra.value; salvar(); atualizarTextos(); piscar($("#avisoCampos"),"Salvo"); });

    var apagar = document.createElement("button");
    apagar.type = "button"; apagar.className = "apagar"; apagar.textContent = "×";
    apagar.setAttribute("aria-label", "Remover o campo " + c.rotulo);
    apagar.addEventListener("click", function(){
      if(E.campos.length <= 2){ piscar($("#avisoCampos"), "Precisa de pelo menos 2 campos"); return; }
      E.campos.splice(i,1); salvar(); montarCampos(); atualizarTextos();
    });

    linha.appendChild(nome); linha.appendChild(tipo); linha.appendChild(extra); linha.appendChild(apagar);
    caixa.appendChild(linha);
  });
}

/* ============ geradores de prompt ============ */
function fichaTexto(){
  return idsDosCampos().map(function(c){
    var t = c.tipo === "lista" ? "lista de opções (" + opcoesDe(c).join(", ") + ")"
          : c.tipo === "longo" ? "texto longo"
          : c.tipo === "numero" ? "número" : "texto curto";
    return "- " + c.rotulo + ": " + t;
  }).join("\n");
}
function prompt1(){
  var c = E.canvas;
  return [
"Sou aluno do 2o ano do ensino medio e estou fazendo meu primeiro projeto de site.",
"Nunca programei antes. Me trate como iniciante total: explique cada passo, diga",
"exatamente em qual arquivo eu colo cada coisa e em que lugar do arquivo.",
"",
"REGRAS QUE VOCE DEVE SEGUIR EM TODAS AS RESPOSTAS:",
"- Use apenas HTML, CSS e JavaScript puro (vanilla).",
"- Nao use React, Vue, Bootstrap, Tailwind, jQuery nem nenhuma biblioteca externa.",
"  Nada de npm, nada de instalar programas.",
"- Meu projeto tem 3 arquivos separados: index.html, style.css e script.js.",
"  Nunca junte tudo em um arquivo so.",
"- Para guardar dados, use localStorage do navegador.",
"- Comente o codigo em portugues, explicando o que cada trecho faz.",
"- Me entregue uma coisa de cada vez e espere eu testar antes de continuar.",
"- No fim de cada resposta, explique em linguagem simples o que o codigo faz.",
"- Nao invente numeros nem estatisticas. Se precisar de um dado, deixe entre",
"  colchetes para eu pesquisar.",
"",
"MEU PROJETO",
"Nome: " + vazio(c.nome,"(preencher)"),
"Problema: " + vazio(c.problema,"(preencher)"),
"Quem sofre: " + vazio(c.quem,"(preencher)"),
"Onde acontece: " + vazio(c.onde,"(preencher)"),
"O que o sistema faz: " + vazio(c.faz,"(preencher)"),
"Quem vai usar: " + vazio(c.usuario,"(preencher)"),
"Por que usariam: " + vazio(c.ganho,"(preencher)"),
"Como se mantem: " + vazio(c.continua,"(preencher)"),
"Como se paga: " + vazio(c.financiamento,"(preencher)"),
"Objetivo de Desenvolvimento Sustentavel: " + textoOds(),
"Indicador de impacto: " + vazio(c.indicador,"(preencher)"),
"",
"CADA FICHA CADASTRADA NO MEU SITE TEM ESTES CAMPOS:",
fichaTexto(),
"A data e preenchida automaticamente pelo sistema.",
"",
"Comece me confirmando que entendeu e me mostrando a estrutura de pastas que eu",
"devo criar. Nao escreva codigo ainda."
  ].join("\n");
}
function prompt2(){
  return [
"Preciso ajustar o index.html do meu projeto. Ele ja funciona, quero melhorar.",
"",
"O que eu quero mudar: [descreva aqui, uma coisa de cada vez]",
"",
"Regras:",
"- Mantenha os 3 arquivos separados e nao mude os ids dos campos do formulario,",
"  porque o script.js depende deles.",
"- Mantenha lang=pt-BR, charset UTF-8 e a meta viewport.",
"- Toda imagem precisa de um alt descritivo.",
"- Todo campo do formulario precisa de label ligada por for e id.",
"- Me mostre apenas o trecho que muda, dizendo onde eu colo, nao o arquivo inteiro.",
"",
"Meu index.html atual:",
"[cole aqui o arquivo inteiro]"
  ].join("\n");
}
function prompt3(){
  var c = E.canvas;
  return [
"Quero ajustar o visual do meu site sobre: " + vazio(c.faz,"(preencher)"),
"Publico que vai usar: " + vazio(c.usuario,"(preencher)"),
"",
"Sensacao que eu quero passar: [escolha: seria e institucional / jovem e colorida /",
"limpa e minimalista / urgente e direta]",
"Cores que eu quero: [descreva, ex: tons de verde escuro com detalhes em amarelo]",
"",
"Regras:",
"- Mexa apenas no style.css, nao mude o HTML.",
"- Mantenha as cores definidas como variaveis no :root, para eu trocar facil depois.",
"- Garanta contraste alto entre texto e fundo, pensando em quem le no celular no sol.",
"- Mantenha o contorno de foco visivel para quem navega pelo teclado.",
"- Nao use nenhum framework nem biblioteca.",
"- Comente cada bloco em portugues dizendo o que ele estiliza.",
"",
"Meu style.css atual:",
"[cole aqui o arquivo inteiro]"
  ].join("\n");
}
function prompt4(){
  return [
"Vou apresentar este codigo para a minha turma e o professor pode perguntar sobre",
"qualquer linha. Explique o trecho abaixo linha por linha, em portugues simples,",
"sem usar termo tecnico sem traduzir.",
"",
"[cole aqui o trecho do seu script.js]",
"",
"Depois da explicacao, me faca 5 perguntas sobre esse trecho para eu testar se",
"entendi de verdade. Espere eu responder antes de dar o gabarito."
  ].join("\n");
}
function prompt5(){
  return [
"Meu site nao esta funcionando.",
"",
"O que eu esperava que acontecesse: [descreva]",
"O que aconteceu de verdade: [descreva]",
"Mensagem vermelha do console (F12 > Console): [cole a mensagem inteira]",
"",
"Meu arquivo atual:",
"[cole aqui o arquivo inteiro onde voce acha que esta o problema]",
"",
"Me diga qual e a causa, o que eu devo trocar e por que aquilo causava o erro.",
"Me de apenas o trecho corrigido e a linha aproximada, nao o arquivo inteiro."
  ].join("\n");
}

/* ============ gerador do index.html ============ */
function gerarHtml(){
  var campos = idsDosCampos();
  var c = E.canvas;
  var L = [];
  var ABRE = "<" + "script", FECHA = "<" + "/script>";

  L.push('<!DOCTYPE html>');
  L.push('<html lang="pt-BR">');
  L.push('<head>');
  L.push('  <meta charset="UTF-8">');
  L.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
  L.push('  <title>' + escTexto(vazio(c.nome,"Nome do Projeto")) + '</title>');
  L.push('  <meta name="description" content="' + escAtrib(vazio(c.faz,"Projeto de responsabilidade socioambiental.")) + '">');
  L.push('  <link rel="stylesheet" href="style.css">');
  L.push('</head>');
  L.push('<body>');
  L.push('');
  L.push('<header class="topo">');
  L.push('  <div class="faixa">');
  L.push('    <p class="marca">' + escTexto(vazio(c.nome,"Nome do Projeto")) + '</p>');
  L.push('    <nav>');
  L.push('      <a href="#problema">O problema</a>');
  L.push('      <a href="#solucao">A solucao</a>');
  L.push('      <a href="#sustentar">Como se paga</a>');
  L.push('      <a href="#cadastrar">Cadastrar</a>');
  L.push('      <a href="#mural">Mural</a>');
  L.push('    </nav>');
  L.push('  </div>');
  L.push('</header>');
  L.push('');
  L.push('<section class="capa">');
  L.push('  <img src="imagens/capa.jpg" alt="TROQUE: descreva a foto de capa">');
  L.push('  <div class="capa-texto">');
  L.push('    <h1>TROQUE: sua frase principal, ate 12 palavras</h1>');
  L.push('    <p>' + escTexto(vazio(c.faz,"TROQUE: o que o seu sistema faz, em uma frase.")) + '</p>');
  L.push('    <a class="botao" href="#cadastrar">Cadastrar agora</a>');
  L.push('  </div>');
  L.push('</section>');
  L.push('');
  L.push('<main>');
  L.push('');
  L.push('<section id="problema" class="bloco">');
  L.push('  <h2>O problema</h2>');
  L.push('  <p class="largura-texto">' + escTexto(vazio(c.problema,"TROQUE: descreva o problema em 4 ou 5 linhas.")) + '</p>');
  L.push('  <p class="largura-texto"><b>Quem sofre com isso:</b> ' + escTexto(vazio(c.quem,"TROQUE")) + '</p>');
  L.push('  <p class="largura-texto"><b>Onde acontece:</b> ' + escTexto(vazio(c.onde,"TROQUE")) + '</p>');
  L.push('  <div class="galeria">');
  L.push('    <figure>');
  L.push('      <img src="imagens/foto1.jpg" alt="TROQUE: descreva a foto 1">');
  L.push('      <figcaption>TROQUE: onde foi, quando foi, o que mostra.</figcaption>');
  L.push('    </figure>');
  L.push('    <figure>');
  L.push('      <img src="imagens/foto2.jpg" alt="TROQUE: descreva a foto 2">');
  L.push('      <figcaption>TROQUE: onde foi, quando foi, o que mostra.</figcaption>');
  L.push('    </figure>');
  L.push('  </div>');
  L.push('</section>');
  L.push('');
  L.push('<section id="solucao" class="bloco">');
  L.push('  <h2>A dor e a solucao</h2>');
  L.push('  <p class="largura-texto">A dor descrita acima e atacada assim:</p>');
  L.push('  <p class="largura-texto"><b>O que este site faz:</b> ' + escTexto(vazio(c.faz,"TROQUE: o que o sistema faz, em uma frase.")) + '</p>');
  L.push('  <p class="largura-texto"><b>Quem vai usar:</b> ' + escTexto(vazio(c.usuario,"TROQUE: quem abre o site e preenche.")) + '</p>');
  L.push('  <p class="largura-texto"><b>O que muda para essa pessoa:</b> ' + escTexto(vazio(c.ganho,"TROQUE: o que ela ganha. Tempo, dinheiro, seguranca, reconhecimento.")) + '</p>');
  L.push('</section>');
  L.push('');
  L.push('<section id="sustentar" class="bloco">');
  L.push('  <h2>Como o projeto se paga</h2>');
  L.push('  <p class="largura-texto">' + escTexto(vazio(c.financiamento,"TROQUE: de onde vem o dinheiro, ou por que nao precisa de dinheiro.")) + '</p>');
  L.push('  <p class="largura-texto"><b>Quem mantem depois da entrega:</b> ' + escTexto(vazio(c.continua,"TROQUE: quem cuida, quem alimenta, quanto custa manter.")) + '</p>');
  L.push('</section>');
  L.push('');
  L.push('<section class="bloco">');
  L.push('  <h2>Os numeros do projeto</h2>');
  L.push('  <p class="largura-texto">Indicador: ' + escTexto(vazio(c.indicador,"TROQUE: o numero que prova que funcionou")) + '</p>');
  L.push('  <div class="painel" id="painel"></div>');
  L.push('</section>');
  L.push('');
  L.push('<section id="cadastrar" class="bloco">');
  L.push('  <h2>Registrar</h2>');
  L.push('  <form id="formulario" class="formulario">');
  campos.forEach(function(cp){
    var largo = (cp.tipo === "longo") ? " largo" : "";
    L.push('    <div class="campo' + largo + '">');
    L.push('      <label for="' + cp.id + '">' + escTexto(cp.rotulo) + '</label>');
    if(cp.tipo === "texto"){
      L.push('      <input type="text" id="' + cp.id + '" maxlength="80" required>');
    } else if(cp.tipo === "numero"){
      L.push('      <input type="number" id="' + cp.id + '" min="0" step="1" required>');
    } else if(cp.tipo === "longo"){
      L.push('      <textarea id="' + cp.id + '" rows="3" maxlength="300" required></textarea>');
    } else {
      L.push('      <select id="' + cp.id + '" required>');
      var ops = opcoesDe(cp);
      if(!ops.length) ops = ["Opcao 1","Opcao 2"];
      ops.forEach(function(o){ L.push('        <option>' + escTexto(o) + '</option>'); });
      L.push('      </select>');
    }
    L.push('    </div>');
  });
  L.push('    <button type="submit" class="botao">Salvar</button>');
  L.push('    <p id="aviso" class="aviso" role="status"></p>');
  L.push('  </form>');
  L.push('</section>');
  L.push('');
  L.push('<section id="mural" class="bloco">');
  L.push('  <h2>Mural</h2>');
  L.push('  <div class="ferramentas">');
  L.push('    <div class="ferramenta">');
  L.push('      <label for="busca">Buscar</label>');
  L.push('      <input type="text" id="busca" placeholder="digite uma palavra">');
  L.push('    </div>');
  var lista = campos.filter(function(x){ return x.tipo === "lista"; })[0];
  if(lista){
    L.push('    <div class="ferramenta">');
    L.push('      <label for="filtro">' + escTexto(lista.rotulo) + '</label>');
    L.push('      <select id="filtro">');
    L.push('        <option value="todas">Todas</option>');
    var ops2 = opcoesDe(lista);
    if(!ops2.length) ops2 = ["Opcao 1","Opcao 2"];
    ops2.forEach(function(o){ L.push('        <option>' + escTexto(o) + '</option>'); });
    L.push('      </select>');
    L.push('    </div>');
  }
  L.push('    <div class="ferramenta">');
  L.push('      <label for="exportar">Dados</label>');
  L.push('      <div class="grupo-botoes">');
  L.push('        <button type="button" id="exportar" class="botao-fino">Baixar</button>');
  L.push('        <label for="importar" class="botao-fino">Carregar</label>');
  L.push('        <input type="file" id="importar" accept="application/json" hidden>');
  L.push('        <button type="button" id="limpar" class="botao-fino perigo">Apagar tudo</button>');
  L.push('      </div>');
  L.push('    </div>');
  L.push('  </div>');
  L.push('  <div id="lista" class="lista"></div>');
  L.push('</section>');
  L.push('');
  L.push('</main>');
  L.push('');
  L.push('<footer class="rodape">');
  L.push('  <p>TROQUE: nomes da equipe, turma, escola e ano.</p>');
  L.push('  <p class="miudo">' + textoOds() + '. Os dados ficam salvos apenas neste navegador. Protótipo escolar.</p>');
  L.push('  <p class="miudo">Fontes dos dados citados: TROQUE ou apague esta linha.</p>');
  L.push('</footer>');
  L.push('');
  L.push(ABRE + ' src="script.js">' + FECHA);
  L.push('</body>');
  L.push('</html>');
  return L.join("\n");
}

/* ============ gerador do script.js ============ */
function gerarJs(){
  var campos = idsDosCampos();
  var lista = campos.filter(function(x){ return x.tipo === "lista"; })[0];
  var numero = campos.filter(function(x){ return x.tipo === "numero"; })[0];
  var titulo = campos[0];
  var L = [];

  L.push('/* =========================================================');
  L.push('   script.js');
  L.push('   Aqui fica o COMPORTAMENTO: salvar, ler, mostrar, buscar e apagar.');
  L.push('   Leia os comentarios. Voce precisa saber explicar este arquivo.');
  L.push('   ========================================================= */');
  L.push('');
  L.push('// A "etiqueta" da gaveta do navegador onde tudo fica guardado.');
  L.push('const CHAVE = "' + slug(vazio(E.canvas.nome,"projeto")) + '-dados";');
  L.push('');
  L.push('// Pegamos os pedacos da pagina com que vamos trabalhar.');
  L.push('const formulario = document.getElementById("formulario");');
  L.push('const listaEl    = document.getElementById("lista");');
  L.push('const painel     = document.getElementById("painel");');
  L.push('const busca      = document.getElementById("busca");');
  if(lista) L.push('const filtro     = document.getElementById("filtro");');
  L.push('const aviso      = document.getElementById("aviso");');
  L.push('');
  L.push('/* ---------- 1. LER o que esta salvo ----------');
  L.push('   A gaveta so guarda texto, entao JSON.parse transforma o');
  L.push('   texto de volta em lista. */');
  L.push('function lerFichas(){');
  L.push('  const texto = localStorage.getItem(CHAVE);');
  L.push('  if(!texto) return [];');
  L.push('  try { return JSON.parse(texto); } catch(erro){ return []; }');
  L.push('}');
  L.push('');
  L.push('/* ---------- 2. GRAVAR na gaveta ----------');
  L.push('   JSON.stringify faz o caminho contrario: lista vira texto. */');
  L.push('function gravarFichas(fichas){');
  L.push('  localStorage.setItem(CHAVE, JSON.stringify(fichas));');
  L.push('}');
  L.push('');
  L.push('/* ---------- 3. Protecao simples ----------');
  L.push('   Se alguem digitar codigo no formulario, isto neutraliza. */');
  L.push('function escapar(texto){');
  L.push('  const caixa = document.createElement("div");');
  L.push('  caixa.textContent = texto;');
  L.push('  return caixa.innerHTML;');
  L.push('}');
  L.push('');
  L.push('/* ---------- 4. MOSTRAR na tela ----------');
  L.push('   Apaga a lista atual e desenha tudo de novo a partir da gaveta. */');
  L.push('function mostrar(){');
  L.push('  const fichas = lerFichas();');
  L.push('  const termo = busca.value.trim().toLowerCase();');
  if(lista) L.push('  const escolhida = filtro.value;');
  L.push('');
  L.push('  const visiveis = fichas.filter(function(f){');
  if(lista){
    L.push('    const passaFiltro = (escolhida === "todas") || (f.' + lista.id + ' === escolhida);');
  } else {
    L.push('    const passaFiltro = true;');
  }
  L.push('    const textoTodo = Object.values(f).join(" ").toLowerCase();');
  L.push('    const passaBusca = (termo === "") || (textoTodo.indexOf(termo) >= 0);');
  L.push('    return passaFiltro && passaBusca;');
  L.push('  });');
  L.push('');
  L.push('  listaEl.innerHTML = "";');
  L.push('');
  L.push('  if(visiveis.length === 0){');
  L.push('    listaEl.innerHTML = \'<p class="vazio">Nenhum registro aqui ainda. Preencha o formulario acima para comecar.</p>\';');
  L.push('    desenharPainel(fichas);');
  L.push('    return;');
  L.push('  }');
  L.push('');
  L.push('  visiveis.forEach(function(f){');
  L.push('    const cartao = document.createElement("article");');
  L.push('    cartao.className = "cartao";');
  if(lista) L.push('    cartao.setAttribute("data-categoria", f.' + lista.id + ');');
  L.push('    let html = "";');
  campos.forEach(function(cp, i){
    if(i === 0){
      L.push('    html += "<h3>" + escapar(f.' + cp.id + ') + "</h3>";');
    } else if(cp.tipo === "lista"){
      L.push('    html += \'<span class="etiqueta">\' + escapar(f.' + cp.id + ') + "</span>";');
    } else {
      L.push('    html += "<p><b>' + escJs(escTexto(cp.rotulo)) + ':</b> " + escapar(f.' + cp.id + ') + "</p>";');
    }
  });
  L.push('    html += \'<footer><small>\' + escapar(f.data) + \'</small>\' +');
  L.push('            \'<button type="button" class="apagar" data-id="\' + f.id + \'">Apagar</button></footer>\';');
  L.push('    cartao.innerHTML = html;');
  L.push('    listaEl.appendChild(cartao);');
  L.push('  });');
  L.push('');
  L.push('  desenharPainel(fichas);');
  L.push('}');
  L.push('');
  L.push('/* ---------- 5. O PAINEL de numeros ----------');
  L.push('   E daqui que sai o dado que voce vai mostrar na apresentacao. */');
  L.push('function desenharPainel(fichas){');
  L.push('  let html = "";');
  L.push('  html += \'<div class="numero"><b>\' + fichas.length + "</b><span>registros no total</span></div>";');
  if(numero){
    L.push('  const soma = fichas.reduce(function(total, f){ return total + Number(f.' + numero.id + ' || 0); }, 0);');
    L.push('  html += \'<div class="numero"><b>\' + soma + "</b><span>' + escJs(escTexto(numero.rotulo.toLowerCase())) + ', somando tudo</span></div>";');
  }
  if(lista){
    L.push('  const porCategoria = {};');
    L.push('  fichas.forEach(function(f){ porCategoria[f.' + lista.id + '] = (porCategoria[f.' + lista.id + '] || 0) + 1; });');
    L.push('  Object.keys(porCategoria).forEach(function(nome){');
    L.push('    html += \'<div class="numero pequeno"><b>\' + porCategoria[nome] + "</b><span>" + escapar(nome) + "</span></div>";');
    L.push('  });');
  }
  L.push('  painel.innerHTML = html;');
  L.push('}');
  L.push('');
  L.push('/* ---------- 6. SALVAR quando o formulario for enviado ---------- */');
  L.push('formulario.addEventListener("submit", function(evento){');
  L.push('  evento.preventDefault();   // impede a pagina de recarregar');
  L.push('');
  L.push('  const nova = {');
  L.push('    id: Date.now(),          // numero unico: a hora exata em milissegundos');
  campos.forEach(function(cp){
    if(cp.tipo === "numero"){
      L.push('    ' + cp.id + ': Number(document.getElementById("' + cp.id + '").value),');
    } else {
      L.push('    ' + cp.id + ': document.getElementById("' + cp.id + '").value.trim(),');
    }
  });
  L.push('    data: new Date().toLocaleDateString("pt-BR")');
  L.push('  };');
  L.push('');
  L.push('  const fichas = lerFichas();');
  L.push('  fichas.unshift(nova);      // unshift coloca no comeco da lista');
  L.push('  gravarFichas(fichas);');
  L.push('');
  L.push('  formulario.reset();');
  L.push('  mostrar();');
  L.push('  aviso.textContent = "Registro salvo. Recarregue a pagina para conferir que ele continua ai.";');
  L.push('  setTimeout(function(){ aviso.textContent = ""; }, 4000);');
  L.push('});');
  L.push('');
  L.push('/* ---------- 7. APAGAR um registro ----------');
  L.push('   O botao de apagar nasce depois que a pagina carrega, entao');
  L.push('   escutamos o clique na lista inteira e verificamos o que foi clicado. */');
  L.push('listaEl.addEventListener("click", function(evento){');
  L.push('  if(!evento.target.classList.contains("apagar")) return;');
  L.push('  const id = Number(evento.target.getAttribute("data-id"));');
  L.push('  const fichas = lerFichas().filter(function(f){ return f.id !== id; });');
  L.push('  gravarFichas(fichas);');
  L.push('  mostrar();');
  L.push('});');
  L.push('');
  L.push('/* ---------- 8. BUSCAR, FILTRAR e APAGAR TUDO ---------- */');
  L.push('busca.addEventListener("input", mostrar);');
  if(lista) L.push('filtro.addEventListener("change", mostrar);');
  L.push('');
  L.push('document.getElementById("limpar").addEventListener("click", function(){');
  L.push('  if(confirm("Apagar todos os registros deste navegador?")){');
  L.push('    localStorage.removeItem(CHAVE);');
  L.push('    mostrar();');
  L.push('  }');
  L.push('});');
  L.push('');
  L.push('/* ---------- 9. BAIXAR e CARREGAR os dados ----------');
  L.push('   Serve para levar os registros de um computador para outro,');
  L.push('   por exemplo do seu para o da apresentacao. */');
  L.push('document.getElementById("exportar").addEventListener("click", function(){');
  L.push('  const texto = JSON.stringify(lerFichas(), null, 2);');
  L.push('  const arquivo = new Blob([texto], {type: "application/json"});');
  L.push('  const link = document.createElement("a");');
  L.push('  link.href = URL.createObjectURL(arquivo);');
  L.push('  link.download = "dados-do-projeto.json";');
  L.push('  link.click();');
  L.push('  URL.revokeObjectURL(link.href);');
  L.push('});');
  L.push('');
  L.push('document.getElementById("importar").addEventListener("change", function(evento){');
  L.push('  const arquivo = evento.target.files[0];');
  L.push('  if(!arquivo) return;');
  L.push('  const leitor = new FileReader();');
  L.push('  leitor.onload = function(){');
  L.push('    try {');
  L.push('      const recebidas = JSON.parse(leitor.result);');
  L.push('      if(!Array.isArray(recebidas)) throw new Error("formato errado");');
  L.push('      gravarFichas(recebidas.concat(lerFichas()));');
  L.push('      mostrar();');
  L.push('      aviso.textContent = recebidas.length + " registros carregados.";');
  L.push('    } catch(erro){');
  L.push('      aviso.textContent = "Esse arquivo nao e um backup valido deste site.";');
  L.push('    }');
  L.push('  };');
  L.push('  leitor.readAsText(arquivo);');
  L.push('});');
  L.push('');
  L.push('/* ---------- 10. Ao abrir a pagina, mostra o que ja estava salvo ---------- */');
  L.push('mostrar();');
  return L.join("\n");
}

/* ============ CSS de referência ============ */
function gerarCss(){
  return [
"/* =========================================================",
"   style.css",
"   Aqui ficam cores, tamanhos e posicoes. Nada aqui funciona,",
"   tudo aqui aparece. Mexa a vontade, e impossivel quebrar.",
"   ========================================================= */",
"",
"/* As cores do site inteiro ficam aqui. Troque um valor e ele",
"   muda em todos os lugares de uma vez. */",
":root{",
"  --tinta:  #10201c;   /* cor do texto */",
"  --papel:  #f1f0ea;   /* fundo da pagina */",
"  --marca:  #1f4e79;   /* cor principal, botoes e barras */",
"  --sinal:  #e39a10;   /* cor de destaque */",
"  --alerta: #a34123;   /* cor de apagar */",
"  --borda:  #ccd2c8;",
"  --largura: 1080px;   /* largura maxima do conteudo */",
"}",
"",
"*{ box-sizing: border-box; margin: 0; padding: 0; }",
"",
"body{",
"  background: var(--papel);",
"  color: var(--tinta);",
"  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;",
"  font-size: 17px;",
"  line-height: 1.6;",
"}",
"",
"h1,h2,h3{ font-family: Georgia, 'Times New Roman', serif; line-height: 1.15; }",
"h1{ font-size: 2.2rem; }",
"h2{ font-size: 1.6rem; margin-bottom: .8rem; }",
"h3{ font-size: 1.1rem; }",
"img{ max-width: 100%; display: block; }",
"a{ color: var(--marca); }",
"",
"/* --------- TOPO --------- */",
".topo{",
"  background: var(--tinta);",
"  border-bottom: 5px solid var(--sinal);",
"  position: sticky;   /* gruda no topo quando rola a pagina */",
"  top: 0;",
"  z-index: 10;",
"}",
".faixa{",
"  max-width: var(--largura); margin: 0 auto; padding: .9rem 1.2rem;",
"  display: flex; flex-wrap: wrap; gap: .8rem;",
"  align-items: center; justify-content: space-between;",
"}",
".marca{ color: #fff; font-weight: 700; }",
".topo nav{ display: flex; gap: 1.2rem; }",
".topo nav a{ color: #d8ddd6; text-decoration: none; font-size: .95rem; }",
".topo nav a:hover{ color: var(--sinal); }",
"",
"/* --------- CAPA --------- */",
".capa{ position: relative; background: var(--tinta); }",
".capa img{ width: 100%; height: 420px; object-fit: cover; opacity: .55; }",
".capa-texto{",
"  position: absolute; inset: 0;",
"  max-width: var(--largura); margin: 0 auto; padding: 2rem 1.2rem;",
"  display: flex; flex-direction: column; justify-content: center;",
"  align-items: flex-start; gap: 1rem; color: #fff;",
"}",
".capa-texto h1{ max-width: 16ch; }",
".capa-texto p{ max-width: 46ch; }",
"",
"/* --------- BOTOES --------- */",
".botao{",
"  display: inline-block; background: var(--sinal); color: var(--tinta);",
"  border: none; padding: .75rem 1.4rem; font-size: 1rem; font-weight: 700;",
"  text-decoration: none; cursor: pointer;",
"}",
".botao:hover{ background: #ffc927; }",
".botao-fino{",
"  background: none; border: 1px solid var(--borda); color: var(--tinta);",
"  padding: .4rem .8rem; font-size: .85rem; cursor: pointer;",
"}",
".botao-fino:hover{ background: var(--borda); }",
".botao-fino.perigo{ border-color: var(--alerta); color: var(--alerta); }",
".botao-fino.perigo:hover{ background: var(--alerta); color: #fff; }",
"",
"/* Contorno visivel para quem navega pelo teclado. Nao apague. */",
"a:focus-visible, button:focus-visible, input:focus-visible,",
"select:focus-visible, textarea:focus-visible, label:focus-visible{",
"  outline: 3px solid var(--marca); outline-offset: 2px;",
"}",
"",
"/* --------- BLOCOS --------- */",
".bloco{",
"  max-width: var(--largura); margin: 0 auto;",
"  padding: 3rem 1.2rem; border-bottom: 1px solid var(--borda);",
"}",
".largura-texto{ max-width: 68ch; margin-bottom: .6rem; }",
"",
".galeria{",
"  margin-top: 1.5rem; display: grid; gap: 1.2rem;",
"  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));",
"}",
".galeria img{ height: 220px; object-fit: cover; width: 100%; }",
"figcaption{",
"  font-size: .85rem; margin-top: .5rem;",
"  border-left: 4px solid var(--sinal); padding-left: .6rem;",
"}",
"",
"/* --------- PAINEL DE NUMEROS --------- */",
".painel{",
"  display: grid; gap: 1rem; margin-top: 1rem;",
"  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));",
"}",
".numero{",
"  background: #fff; border: 1px solid var(--borda);",
"  border-top: 5px solid var(--marca); padding: 1rem;",
"}",
".numero b{ display: block; font-size: 2.1rem; line-height: 1; }",
".numero span{ font-size: .8rem; color: #55605a; }",
".numero.pequeno{ border-top-color: var(--sinal); }",
".numero.pequeno b{ font-size: 1.4rem; }",
"",
"/* --------- FORMULARIO --------- */",
".formulario{",
"  display: grid; gap: 1rem; max-width: 760px;",
"  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));",
"}",
".campo{ display: flex; flex-direction: column; gap: .3rem; }",
".campo.largo{ grid-column: 1 / -1; }",
"label{ font-size: .85rem; font-weight: 600; }",
"input, select, textarea{",
"  font: inherit; padding: .6rem; border: 1px solid var(--borda);",
"  background: #fff; color: var(--tinta);",
"}",
".formulario .botao{ grid-column: 1 / -1; justify-self: start; }",
".aviso{ grid-column: 1 / -1; font-size: .9rem; color: var(--marca); min-height: 1.4em; }",
"",
"/* --------- FERRAMENTAS DO MURAL --------- */",
".ferramentas{",
"  display: flex; gap: 1rem; flex-wrap: wrap;",
"  align-items: flex-end; margin: 1rem 0 1.5rem;",
"}",
".ferramenta{ display: flex; flex-direction: column; gap: .3rem; }",
".grupo-botoes{ display: flex; gap: .4rem; flex-wrap: wrap; }",
".grupo-botoes label{ cursor: pointer; }",
"",
"/* --------- CARTOES --------- */",
".lista{",
"  display: grid; gap: 1rem;",
"  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));",
"}",
".cartao{",
"  background: #fff; border: 1px solid var(--borda);",
"  border-left: 6px solid var(--marca); padding: 1rem;",
"  display: flex; flex-direction: column; gap: .5rem;",
"}",
".cartao p{ font-size: .92rem; }",
".etiqueta{ font-size: .75rem; font-weight: 700; color: #55605a; }",
".cartao footer{",
"  display: flex; justify-content: space-between; align-items: center;",
"  gap: .5rem; margin-top: auto; padding-top: .5rem;",
"  border-top: 1px dashed var(--borda); font-size: .8rem;",
"}",
".cartao .apagar{",
"  background: none; border: 1px solid var(--alerta); color: var(--alerta);",
"  padding: .25rem .6rem; font-size: .78rem; cursor: pointer;",
"}",
".cartao .apagar:hover{ background: var(--alerta); color: #fff; }",
".vazio{",
"  grid-column: 1 / -1; padding: 2rem; text-align: center;",
"  border: 2px dashed var(--borda); color: #55605a;",
"}",
"",
"/* --------- RODAPE --------- */",
".rodape{ background: var(--tinta); color: #d8ddd6; padding: 2rem 1.2rem; text-align: center; }",
".miudo{ font-size: .8rem; color: #97a19b; margin-top: .4rem; }",
"",
"/* --------- CELULAR --------- */",
"/* Tudo aqui dentro so vale em telas de ate 640px de largura */",
"@media (max-width: 640px){",
"  h1{ font-size: 1.7rem; }",
"  .capa img{ height: 340px; }",
"  .bloco{ padding: 2rem 1rem; }",
"  .ferramentas{ flex-direction: column; align-items: stretch; }",
"}"
  ].join("\n");
}

/* ============ resumo final ============ */
function resumo(){
  var c = E.canvas;
  var linhas = [
"PROJETO: " + vazio(c.nome,"(sem nome)"),
"",
"PROBLEMA",
vazio(c.problema,"(nao preenchido)"),
"",
"QUEM SOFRE: " + vazio(c.quem,"(nao preenchido)"),
"ONDE: " + vazio(c.onde,"(nao preenchido)"),
"",
"O QUE O SISTEMA FAZ",
vazio(c.faz,"(nao preenchido)"),
"",
"QUEM USA: " + vazio(c.usuario,"(nao preenchido)"),
"POR QUE USARIA: " + vazio(c.ganho,"(nao preenchido)"),
"COMO SE MANTEM: " + vazio(c.continua,"(nao preenchido)"),
"",
"COMO SE PAGA",
vazio(c.financiamento,"(nao preenchido)"),
"",
"ODS: " + textoOds(),
"INDICADOR DE IMPACTO: " + vazio(c.indicador,"(nao preenchido)"),
"",
"CAMPOS DE CADA FICHA",
fichaTexto(),
"Data preenchida automaticamente.",
"",
"TECNOLOGIA",
"HTML, CSS e JavaScript puro, em tres arquivos separados.",
"Persistencia com localStorage do navegador.",
"",
"LINK DO SITE: ____________________________________",
"EQUIPE: __________________________________________",
"TURMA: ___________________________________________"
  ];
  return linhas.join("\n");
}

/* ============ atualizar todos os textos gerados ============ */
function atualizarTextos(){
  var alvos = {
    prompt1: prompt1, prompt2: prompt2, prompt3: prompt3,
    prompt4: prompt4, prompt5: prompt5,
    codHtml: gerarHtml, codCss: gerarCss, codJs: gerarJs,
    resumoFinal: resumo
  };
  for(var id in alvos){
    var el = document.getElementById(id);
    if(el) el.textContent = alvos[id]();
  }
}

/* ============ copiar ============ */
document.addEventListener("click", function(ev){
  var btn = ev.target.closest ? ev.target.closest(".copiar") : null;
  if(!btn) return;
  var pre = btn.closest(".codigo").querySelector("pre");
  var texto = pre.textContent;
  if(pre.id) contar("copias", pre.id, "copiasEm");
  function ok(){
    var antes = btn.textContent;
    btn.textContent = "Copiado";
    btn.classList.add("pronto");
    setTimeout(function(){ btn.textContent = antes; btn.classList.remove("pronto"); }, 1800);
  }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(texto).then(ok, function(){ selecionar(pre); });
  } else { selecionar(pre); }
});
function selecionar(pre){
  var faixa = document.createRange();
  faixa.selectNodeContents(pre);
  var sel = window.getSelection();
  sel.removeAllRanges(); sel.addRange(faixa);
}

/* ============ progresso ============ */
function montarProgresso(){
  $$("input[data-passo]").forEach(function(chk){
    var n = chk.getAttribute("data-passo");
    chk.checked = !!E.passos[n];
    chk.addEventListener("change", function(){
      E.passos[n] = chk.checked;
      var r = reg();
      if(!r.passosEm || typeof r.passosEm !== "object") r.passosEm = {};
      if(chk.checked){ if(!r.passosEm[n]) r.passosEm[n] = agora(); }
      else { delete r.passosEm[n]; }
      salvar(); pintarProgresso();
    });
  });
  pintarProgresso();
}
function pintarProgresso(){
  var total = 14, feitos = 0;
  for(var i=1;i<=total;i++) if(E.passos[i]) feitos++;
  $("#feitos").textContent = feitos;
  $("#barra").style.width = Math.round(feitos/total*100) + "%";
  $$(".rail a").forEach(function(a){
    var alvo = a.getAttribute("href").replace("#e","");
    a.classList.toggle("ok", !!E.passos[alvo]);
  });
}

/* ============ teste da ideia ============ */
function montarTesteIdeia(){
  var caixas = $$(".tq"), saida = $("#veredito");
  function ver(){
    var n = caixas.filter(function(c){ return c.checked; }).length;
    saida.className = "veredito";
    if(n === 0){ saida.textContent = "Marque as caixas acima para ver o resultado do teste."; return; }
    if(n <= 2){
      saida.classList.add("ruim");
      saida.textContent = n + " de 5. Seu problema ainda está distante demais. Escolha algo que você consiga fotografar e sobre o qual consiga entrevistar alguém.";
    } else if(n <= 4){
      saida.textContent = n + " de 5. Dá para trabalhar, mas ainda falta concretude. Veja quais caixas ficaram vazias e resolva essas antes de seguir.";
    } else {
      saida.classList.add("bom");
      saida.textContent = "5 de 5. Problema aprovado. Pode seguir para a etapa 3 com confiança.";
    }
  }
  caixas.forEach(function(c){ c.addEventListener("change", ver); });
  ver();
}

/* ============ checklists ============ */
var ITENS_TESTE = [
 "O arquivo principal se chama exatamente index.html",
 "Os três arquivos estão na mesma pasta, no primeiro nível",
 "As fotos estão dentro de imagens/ e nenhuma passa de 300 KB",
 "Nenhum nome de arquivo tem espaço, acento ou maiúscula",
 "A página tem cor, ou seja, o CSS está sendo aplicado",
 "O formulário salva e o registro aparece na lista",
 "Fechei o navegador, abri de novo e os dados continuavam lá",
 "A busca encontra um registro pelo nome",
 "O filtro mostra só a categoria escolhida",
 "O botão de apagar funciona",
 "O painel de números está calculando certo",
 "Todas as imagens aparecem, nenhuma quebrada",
 "Todas as imagens têm alt escrito",
 "Não sobrou nenhum texto começando com TROQUE",
 "O rodapé tem os nomes reais da equipe e da turma",
 "Console sem nenhum erro vermelho",
 "Testei na simulação de tela de celular"
];
var ITENS_ENTREGA = [
 "O link público do site funcionando",
 "A pasta do projeto compactada em .zip",
 "O resumo do projeto preenchido",
 "O site explica o problema, e não só mostra o cadastro",
 "O site diz qual é a dor de quem vive o problema e o que muda para essa pessoa",
 "O site diz como o projeto se paga, ou por que não precisa de dinheiro",
 "Um print da tela com pelo menos 5 registros cadastrados",
 "A lista de quais fotos são minhas e quem aparece nelas com autorização",
 "Abri o link no celular, fora do wi-fi da escola, e funcionou",
 "Cadastrei 5 registros de exemplo no computador da apresentação",
 "Gerei o QR Code do link",
 "Sei explicar a função que salva os dados",
 "Sei responder o que acontece se abrirem o site em outro celular"
];
function montarChecklist(alvo, itens, grupo){
  var caixa = $(alvo);
  if(!caixa) return;
  caixa.innerHTML = "";
  itens.forEach(function(texto, i){
    var chave = grupo + i;
    var lab = document.createElement("label");
    var chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = !!E[grupo][chave];
    chk.addEventListener("change", function(){ E[grupo][chave] = chk.checked; salvar(); });
    var span = document.createElement("span");
    span.textContent = texto;
    lab.appendChild(chk); lab.appendChild(span);
    caixa.appendChild(lab);
  });
}

/* ============ socorro ============ */
var ERROS = [
 {s:"A página abriu totalmente em branco depois de publicar",
  c:"O index.html não está no primeiro nível da pasta que você enviou. Provavelmente tem uma pasta dentro da pasta.",
  f:"Abra a pasta que você arrastou. Você tem que ver o index.html logo de cara, sem clicar em nada. Se tiver outra pasta ali, arraste a de dentro."},
 {s:"O site ficou sem cor nenhuma, só texto preto",
  c:"A linha que chama o CSS está faltando, ou o nome está diferente do nome do arquivo.",
  f:"Confira se existe <link rel=\"stylesheet\" href=\"style.css\"> dentro do head, e se o arquivo se chama exatamente style.css, minúsculo."},
 {s:"Os botões não fazem absolutamente nada",
  c:"Ou a linha do script está faltando, ou ela foi colocada no head em vez do fim do body.",
  f:"A linha do script tem que ser a última coisa antes de fechar o body. Mova para lá e atualize com Ctrl + F5."},
 {s:"O console mostra: Cannot read properties of null",
  c:"O JavaScript está procurando um id que não existe no HTML, ou que está escrito de um jeito diferente.",
  f:"Leia o nome que aparece no erro. Procure esse mesmo nome no seu HTML. Na maioria das vezes é diferença de maiúscula ou uma letra trocada."},
 {s:"Os acentos viraram símbolos estranhos",
  c:"Falta a declaração de charset no HTML.",
  f:"Coloque <meta charset=\"UTF-8\"> como primeira linha dentro do head."},
 {s:"A imagem sumiu só depois de publicar",
  c:"Maiúscula e minúscula. Seu computador não diferencia, o servidor diferencia.",
  f:"Renomeie o arquivo para tudo minúsculo e corrija o nome dentro do HTML também. Republique."},
 {s:"Os dados somem quando eu recarrego a página",
  c:"Você está mostrando na tela mas não está gravando no localStorage.",
  f:"Confira se a função que salva chama localStorage.setItem. Faça o teste dos três passos da etapa 11."},
 {s:"O formulário recarrega a página quando eu clico em salvar",
  c:"Falta impedir o comportamento padrão do formulário.",
  f:"A primeira linha dentro do addEventListener de submit tem que ser evento.preventDefault();"},
 {s:"Mudei o código e nada mudou no navegador",
  c:"O arquivo não foi salvo, ou o navegador está mostrando a versão antiga.",
  f:"Ctrl + S no editor. Bolinha ao lado do nome da aba significa não salvo. Depois Ctrl + F5 no navegador."},
 {s:"Estava tudo funcionando e quebrou geral",
  c:"A IA reescreveu um pedaço grande demais e levou junto algo que funcionava.",
  f:"Volte para a pasta da versão anterior que você salvou. Se não salvou, peça à IA apenas o trecho, nunca o arquivo inteiro, daqui para frente."},
 {s:"O site fica torto ou com barra de rolagem lateral no celular",
  c:"Algum elemento tem largura fixa maior que a tela.",
  f:"Confira se existe a meta viewport no head. Depois procure larguras em pixels no CSS e troque por porcentagem ou max-width."},
 {s:"O Netlify não aceita ou trava no envio",
  c:"Arquivo grande demais, quase sempre uma foto de celular sem compactar.",
  f:"Volte na etapa 12 e compacte todas as fotos para menos de 300 KB cada."}
];
function montarSocorro(){
  var caixa = $("#sintomas"), painel = $("#diagnostico");
  function mostrar(i){
    var e = ERROS[i];
    painel.innerHTML = "";
    var h = document.createElement("h4"); h.textContent = e.s;
    var p1 = document.createElement("p"); p1.innerHTML = "<b>Causa provável:</b> " + e.c;
    var p2 = document.createElement("p"); p2.innerHTML = "<b>O que fazer:</b> " + e.f;
    painel.appendChild(h); painel.appendChild(p1); painel.appendChild(p2);
    $$("#sintomas button").forEach(function(b, j){ b.setAttribute("aria-pressed", j === i ? "true" : "false"); });
  }
  ERROS.forEach(function(e, i){
    var b = document.createElement("button");
    b.type = "button"; b.textContent = e.s;
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", function(){
      contar("socorro", e.s);
      mostrar(i);
    });
    caixa.appendChild(b);
  });
  mostrar(0);
}

/* ============ navegação e tema ============ */
function montarNavegacao(){
  var abrir = $("#abrirRail"), fechar = $("#fecharRail"), rail = $("#rail");
  function estreito(){ return window.matchMedia("(max-width: 860px)").matches; }
  function fecha(){ if(estreito()){ rail.hidden = true; abrir.setAttribute("aria-expanded","false"); } }
  function ajusta(){ rail.hidden = estreito(); abrir.setAttribute("aria-expanded","false"); }
  abrir.addEventListener("click", function(){
    rail.hidden = !rail.hidden;
    abrir.setAttribute("aria-expanded", rail.hidden ? "false" : "true");
    if(!rail.hidden) fechar.focus();
  });
  fechar.addEventListener("click", function(){ fecha(); abrir.focus(); });
  $$(".rail a").forEach(function(a){ a.addEventListener("click", fecha); });
  document.addEventListener("keydown", function(e){ if(e.key === "Escape") fecha(); });
  window.addEventListener("resize", ajusta);
  ajusta();

  if("IntersectionObserver" in window){
    var obs = new IntersectionObserver(function(entradas){
      entradas.forEach(function(en){
        if(!en.isIntersecting) return;
        var id = en.target.id;
        $$(".rail a").forEach(function(a){
          a.classList.toggle("atual", a.getAttribute("href") === "#" + id);
        });
      });
    }, {rootMargin: "-80px 0px -70% 0px"});
    $$(".etapa").forEach(function(s){ obs.observe(s); });
  }
}
function montarTema(){
  var btn = $("#btnTema");
  var raiz = document.documentElement;
  try{
    var g = localStorage.getItem(CHAVE + "-tema");
    if(g) raiz.setAttribute("data-theme", g);
  }catch(e){}
  btn.addEventListener("click", function(){
    var escuroAgora = raiz.getAttribute("data-theme") === "dark" ||
      (!raiz.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var novo = escuroAgora ? "light" : "dark";
    raiz.setAttribute("data-theme", novo);
    try{ localStorage.setItem(CHAVE + "-tema", novo); }catch(e){}
  });
}

/* ============ baixar os arquivos do projeto ============
   Monta um .zip na hora, dentro do navegador, sem biblioteca nenhuma.
   O zip e do tipo "sem compressao": e um formato valido que qualquer
   Windows, Mac ou Linux abre com dois cliques. */

function crc32(bytes){
  var tabela = crc32.tabela;
  if(!tabela){
    tabela = crc32.tabela = new Uint32Array(256);
    for(var n=0; n<256; n++){
      var c = n;
      for(var k=0; k<8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      tabela[n] = c >>> 0;
    }
  }
  var crc = 0xFFFFFFFF;
  for(var i=0; i<bytes.length; i++) crc = (crc >>> 8) ^ tabela[(crc ^ bytes[i]) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function montarZip(arquivos){
  var enc = new TextEncoder();
  var pedacos = [], central = [], deslocamento = 0, tamanhoCentral = 0;

  arquivos.forEach(function(a){
    var nome  = enc.encode(a.nome);
    var dados = enc.encode(a.texto);
    var crc   = crc32(dados);

    var local = new Uint8Array(30 + nome.length);
    var vL = new DataView(local.buffer);
    vL.setUint32(0, 0x04034b50, true);   // assinatura
    vL.setUint16(4, 20, true);           // versao necessaria
    vL.setUint16(6, 0x0800, true);       // nomes em UTF-8
    vL.setUint16(8, 0, true);            // metodo: sem compressao
    vL.setUint32(14, crc, true);
    vL.setUint32(18, dados.length, true);
    vL.setUint32(22, dados.length, true);
    vL.setUint16(26, nome.length, true);
    local.set(nome, 30);
    pedacos.push(local, dados);

    var reg = new Uint8Array(46 + nome.length);
    var vC = new DataView(reg.buffer);
    vC.setUint32(0, 0x02014b50, true);
    vC.setUint16(4, 20, true);
    vC.setUint16(6, 20, true);
    vC.setUint16(8, 0x0800, true);
    vC.setUint16(10, 0, true);
    vC.setUint32(16, crc, true);
    vC.setUint32(20, dados.length, true);
    vC.setUint32(24, dados.length, true);
    vC.setUint16(28, nome.length, true);
    vC.setUint32(42, deslocamento, true);
    reg.set(nome, 46);
    central.push(reg);

    deslocamento += local.length + dados.length;
    tamanhoCentral += reg.length;
  });

  var fim = new Uint8Array(22);
  var vF = new DataView(fim.buffer);
  vF.setUint32(0, 0x06054b50, true);
  vF.setUint16(8, arquivos.length, true);
  vF.setUint16(10, arquivos.length, true);
  vF.setUint32(12, tamanhoCentral, true);
  vF.setUint32(16, deslocamento, true);

  return new Blob(pedacos.concat(central, [fim]), {type:"application/zip"});
}

function baixar(blob, nomeArquivo){
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
}

var LEIAME_IMAGENS = [
"COLOQUE AS SUAS FOTOS NESTA PASTA.",
"",
"Regras:",
"1. So fotos tiradas por voce ou pela sua equipe.",
"2. Nome do arquivo tudo minusculo, sem espaco e sem acento.",
"   Certo: praca-antes.jpg      Errado: Praca Antes.JPG",
"3. Cada foto abaixo de 300 KB. Compacte em squoosh.app ou tinypng.com.",
"4. O index.html espera encontrar tres arquivos aqui:",
"      capa.jpg",
"      foto1.jpg",
"      foto2.jpg",
"   Se voce usar outros nomes, corrija tambem dentro do index.html.",
"",
"Depois de colocar as fotos, pode apagar este arquivo."
].join("\n");

function arquivosDoProjeto(){
  return [
    {nome:"index.html",           texto:gerarHtml()},
    {nome:"style.css",            texto:gerarCss()},
    {nome:"script.js",            texto:gerarJs()},
    {nome:"imagens/LEIA-ME.txt",  texto:LEIAME_IMAGENS},
    {nome:"RESUMO-DO-PROJETO.txt",texto:resumo()}
  ];
}

function ligarDownloads(){
  var zipBtn = $("#baixarZip");
  if(!zipBtn) return;
  var saida = $("#avisoZip");
  var nomeBase = slug(vazio(E.canvas.nome,"projeto")).toLowerCase() || "projeto";

  zipBtn.addEventListener("click", function(){
    try{
      var r = reg();
      r.zip = (r.zip || 0) + 1;
      if(!Array.isArray(r.zipEm)) r.zipEm = [];
      if(r.zipEm.length < 100) r.zipEm.push(agora());
      salvar();
      baixar(montarZip(arquivosDoProjeto()), nomeBase + ".zip");
      piscar(saida, "Pronto. Procure na pasta Downloads e extraia.");
    }catch(erro){
      piscar(saida, "Seu navegador bloqueou o download. Use os botoes de copiar mais abaixo.");
    }
  });

  [["#baixarHtml","index.html",gerarHtml],
   ["#baixarCss","style.css",gerarCss],
   ["#baixarJs","script.js",gerarJs]].forEach(function(t){
    var b = $(t[0]);
    if(!b) return;
    b.addEventListener("click", function(){
      try{
        baixar(new Blob([t[2]()], {type:"text/plain;charset=utf-8"}), t[1]);
        piscar(saida, t[1] + " baixado.");
      }catch(erro){
        piscar(saida, "Seu navegador bloqueou o download. Use o botao de copiar.");
      }
    });
  });
}

/* ============ ficha de uso, para o professor ============
   Gera um .json com o que foi preenchido e com a contagem de uso da página.
   Não contém nome de ninguém: o aluno escreve só o código da equipe que o
   professor entregou. O arquivo só existe quando o aluno clica no botão. */
function fichaDeUso(){
  var r = reg();
  return {
    formato: "oficina-de-impacto/ficha-de-uso/1",
    geradoEm: agora(),
    equipe: r.equipe || "",
    turma: r.turma || "",
    uso: {
      inicio: r.inicio || "",
      fim: r.fim || "",
      dias: r.dias || [],
      copias: r.copias || {},
      copiasEm: r.copiasEm || {},
      passosEm: r.passosEm || {},
      zip: r.zip || 0,
      zipEm: r.zipEm || [],
      socorro: r.socorro || {}
    },
    projeto: {
      canvas: E.canvas,
      ods: E.ods,
      campos: E.campos,
      passos: E.passos,
      teste: E.teste,
      entrega: E.entrega
    }
  };
}

function ligarFicha(){
  var campoEquipe = $("#codEquipe"), campoTurma = $("#codTurma");
  var botao = $("#baixarFicha"), saida = $("#avisoFicha");
  if(!botao) return;

  if(campoEquipe){
    campoEquipe.value = reg().equipe || "";
    campoEquipe.addEventListener("input", function(){
      reg().equipe = campoEquipe.value.trim().slice(0, 24);
      salvar();
    });
  }
  if(campoTurma){
    campoTurma.value = reg().turma || "";
    campoTurma.addEventListener("input", function(){
      reg().turma = campoTurma.value.trim().slice(0, 24);
      salvar();
    });
  }

  botao.addEventListener("click", function(){
    var r = reg();
    if(!r.equipe){
      piscar(saida, "Escreva o código da equipe antes de baixar.");
      if(campoEquipe) campoEquipe.focus();
      return;
    }
    try{
      var nome = "ficha-" + slug(r.equipe).toLowerCase() + ".json";
      var texto = JSON.stringify(fichaDeUso(), null, 2);
      baixar(new Blob([texto], {type:"application/json;charset=utf-8"}), nome);
      piscar(saida, "Baixado como " + nome + ". Entregue este arquivo junto com o link do site.");
    }catch(erro){
      piscar(saida, "Seu navegador bloqueou o download. Avise o professor.");
    }
  });
}

/* ============ partida ============ */
montarOds();
montarCanvas();
montarCampos();
montarProgresso();
montarTesteIdeia();
montarChecklist("#listaTeste", ITENS_TESTE, "teste");
montarChecklist("#listaEntrega", ITENS_ENTREGA, "entrega");
montarSocorro();
montarNavegacao();
montarTema();
ligarDownloads();
ligarFicha();
atualizarTextos();

$("#limparCanvas").addEventListener("click", function(){
  if(!confirm("Apagar tudo o que você escreveu no Canvas e voltar ao exemplo?")) return;
  E.canvas = JSON.parse(JSON.stringify(PADRAO.canvas));
  E.ods = [];
  salvar(); montarCanvas(); montarOds(); atualizarTextos();
});
$("#addCampo").addEventListener("click", function(){
  if(E.campos.length >= 8){ piscar($("#avisoCampos"), "Oito campos já é demais para quem preenche"); return; }
  E.campos.push({rotulo:"Novo campo", tipo:"texto", opcoes:""});
  salvar(); montarCampos(); atualizarTextos();
});
$("#recomecar").addEventListener("click", function(){
  if(!confirm("Isto apaga TUDO o que foi preenchido nesta página: Canvas, ODS, campos, progresso e checklists.\n\nO trabalho do aluno anterior será perdido. Continuar?")) return;
  try{ localStorage.removeItem(CHAVE); }catch(e){}
  E = JSON.parse(JSON.stringify(PADRAO));
  salvar();
  montarCanvas(); montarOds(); montarCampos(); montarProgresso();
  montarChecklist("#listaTeste", ITENS_TESTE, "teste");
  montarChecklist("#listaEntrega", ITENS_ENTREGA, "entrega");
  if($("#codEquipe")) $("#codEquipe").value = "";
  if($("#codTurma")) $("#codTurma").value = "";
  atualizarTextos();
  window.scrollTo({top:0, behavior:"smooth"});
});
$("#restaurarCampos").addEventListener("click", function(){
  E.campos = JSON.parse(JSON.stringify(PADRAO.campos));
  salvar(); montarCampos(); atualizarTextos();
});
})();
