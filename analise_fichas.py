# -*- coding: utf-8 -*-
"""
Lê as fichas de uso exportadas pela Oficina de Impacto e produz os números
do artigo.

Uso:
    python3 analise_fichas.py pasta_com_as_fichas

Saída, na mesma pasta do script:
    resultados.txt        números prontos para colar no artigo
    fig1_prompts.png      uso de cada prompt
    fig2_etapas.png       até onde cada equipe chegou nas 14 etapas
"""
import sys
import os
import json
import glob
from datetime import datetime, timezone

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

AQUI = os.path.dirname(os.path.abspath(__file__))
TOTAL_ETAPAS = 14

ROTULO_PROMPT = {
    "prompt1": "1  criar o projeto",
    "prompt2": "2  ajustar o HTML",
    "prompt3": "3  ajustar o visual",
    "prompt4": "4  explicar e me testar",
    "prompt5": "5  consertar erro",
}
ROTULO_CODIGO = {
    "codHtml": "index.html",
    "codCss": "style.css",
    "codJs": "script.js",
    "resumoFinal": "resumo do projeto",
}

# Canvas que já vem preenchido na ferramenta. Serve para detectar a equipe que
# não editou nada e deixou o exemplo, que não pode contar como produção dela.
EXEMPLO = {
    "nome": "Mural de Ações do Bairro",
    "problema": "Ações de limpeza e doação acontecem no bairro, mas ninguém registra, então nada é cobrado nem tem continuidade.",
    "quem": "Moradores da Vila Nova que organizam mutirões por conta própria e nunca sabem o que já foi feito.",
    "onde": "Vila Nova, entre a Rua das Palmeiras e a praça central.",
    "faz": "Registra cada ação realizada no bairro com responsável, local e data, e mostra tudo num mural público.",
    "usuario": "Moradores, a associação de bairro e os alunos que organizam mutirões.",
    "ganho": "O trabalho dela fica visível e ela consegue mostrar para a prefeitura o que já foi feito.",
    "continua": "A associação de moradores fica com a senha e alimenta o mural. O site é gratuito, não tem custo mensal.",
    "indicador": "número de ações cadastradas por moradores diferentes em 4 semanas",
}


def ler(pasta):
    fichas = []
    for caminho in sorted(glob.glob(os.path.join(pasta, "*.json"))):
        try:
            with open(caminho, encoding="utf-8") as f:
                d = json.load(f)
        except (json.JSONDecodeError, OSError) as erro:
            print(f"  ignorado: {os.path.basename(caminho)} ({erro})")
            continue
        if not str(d.get("formato", "")).startswith("oficina-de-impacto/ficha-de-uso"):
            print(f"  ignorado: {os.path.basename(caminho)} (não é ficha da oficina)")
            continue
        d["_arquivo"] = os.path.basename(caminho)
        fichas.append(d)
    return fichas


def quando(iso):
    if not iso:
        return None
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return None


def pct(parte, total):
    return 0.0 if not total else 100.0 * parte / total


def main():
    if len(sys.argv) < 2:
        sys.exit("Uso: python3 analise_fichas.py pasta_com_as_fichas")
    pasta = sys.argv[1]
    if not os.path.isdir(pasta):
        sys.exit(f"Pasta não encontrada: {pasta}")

    fichas = ler(pasta)
    if not fichas:
        sys.exit("Nenhuma ficha válida encontrada na pasta.")

    out = []
    w = out.append
    n = len(fichas)

    w("=" * 70)
    w("OFICINA DE IMPACTO, FICHAS DE USO")
    w("=" * 70)

    # ------------------------------------------------- participação
    turmas = sorted({f.get("turma", "") for f in fichas if f.get("turma")})
    w(f"\nPARTICIPAÇÃO\n  Equipes com ficha entregue: {n}")
    w(f"  Turmas: {', '.join(turmas) if turmas else 'não informado'}")

    dias = [len(f["uso"].get("dias") or []) for f in fichas]
    if dias:
        w(f"  Dias distintos de uso por equipe: mediana {sorted(dias)[len(dias) // 2]}, "
          f"mínimo {min(dias)}, máximo {max(dias)}")

    duracoes = []
    for f in fichas:
        ini, fim = quando(f["uso"].get("inicio")), quando(f["uso"].get("fim"))
        if ini and fim:
            duracoes.append((fim - ini).days)
    if duracoes:
        duracoes.sort()
        w(f"  Dias entre o primeiro e o último acesso: mediana "
          f"{duracoes[len(duracoes) // 2]}, máximo {max(duracoes)}")

    # ------------------------------------------------------ prompts
    w("\nUSO DOS PROMPTS")
    por_prompt = {k: 0 for k in ROTULO_PROMPT}
    equipes_que_usaram = {k: 0 for k in ROTULO_PROMPT}
    for f in fichas:
        copias = f["uso"].get("copias") or {}
        for k in ROTULO_PROMPT:
            c = int(copias.get(k, 0))
            por_prompt[k] += c
            if c:
                equipes_que_usaram[k] += 1

    total_prompts = sum(por_prompt.values())
    w(f"  Total de cópias de prompt: {total_prompts}")
    w(f"\n  {'prompt':<26}{'cópias':>9}{'equipes':>10}{'% equipes':>12}")
    for k, rot in ROTULO_PROMPT.items():
        w(f"  {rot:<26}{por_prompt[k]:>9}{equipes_que_usaram[k]:>10}"
          f"{pct(equipes_que_usaram[k], n):>11.0f}%")

    gerar = por_prompt["prompt1"]
    compreender = por_prompt["prompt4"]
    w(f"\n  Gerar (prompt 1) versus compreender (prompt 4): {gerar} para {compreender}")
    if gerar:
        w(f"  Razão compreender/gerar: {compreender / gerar:.2f}")
    w(f"  Equipes que nunca copiaram o prompt 4: "
      f"{n - equipes_que_usaram['prompt4']} de {n} "
      f"({pct(n - equipes_que_usaram['prompt4'], n):.0f}%)")
    w("  Este é o número central do artigo: mede se o andaime de compreensão foi usado.")

    # ------------------------------------------- cópias de código
    w("\nCÓPIAS DE CÓDIGO GERADO PELA FERRAMENTA")
    for k, rot in ROTULO_CODIGO.items():
        total = sum(int((f["uso"].get("copias") or {}).get(k, 0)) for f in fichas)
        eqs = sum(1 for f in fichas if (f["uso"].get("copias") or {}).get(k, 0))
        w(f"  {rot:<22}{total:>6} cópias   {eqs:>3} equipes")
    baixou_zip = sum(1 for f in fichas if int(f["uso"].get("zip", 0)) > 0)
    w(f"  Baixaram o .zip: {baixou_zip} de {n} ({pct(baixou_zip, n):.0f}%)")

    # ------------------------------------------------------ etapas
    w("\nPROGRESSO NAS 14 ETAPAS")
    alcance = []
    por_etapa = []
    for i in range(1, TOTAL_ETAPAS + 1):
        c = sum(1 for f in fichas if (f["projeto"].get("passos") or {}).get(str(i)))
        por_etapa.append(c)
    for f in fichas:
        passos = f["projeto"].get("passos") or {}
        feitos = [i for i in range(1, TOTAL_ETAPAS + 1) if passos.get(str(i))]
        alcance.append(max(feitos) if feitos else 0)

    w(f"  {'etapa':<8}{'equipes':>9}{'%':>8}")
    for i, c in enumerate(por_etapa, 1):
        w(f"  {i:<8}{c:>9}{pct(c, n):>7.0f}%")

    if alcance:
        alcance_ord = sorted(alcance)
        w(f"\n  Etapa mais avançada alcançada: mediana "
          f"{alcance_ord[len(alcance_ord) // 2]}, máximo {max(alcance)}")
    quedas = [(i, por_etapa[i - 1] - por_etapa[i]) for i in range(1, TOTAL_ETAPAS)]
    if quedas:
        pior = max(quedas, key=lambda t: t[1])
        if pior[1] > 0:
            plural = "equipe" if pior[1] == 1 else "equipes"
            w(f"  Maior queda entre etapas consecutivas: da etapa {pior[0]} "
              f"para a {pior[0] + 1}, {pior[1]} {plural} a menos")
            w("  É aqui que o design da ferramenta perde o aluno. Evidência para o redesenho.")

    # ----------------------------------------------------- socorro
    sintomas = {}
    for f in fichas:
        for s, c in (f["uso"].get("socorro") or {}).items():
            sintomas[s] = sintomas.get(s, 0) + int(c)
    if sintomas:
        w("\nSOLUCIONADOR DE ERROS, SINTOMAS MAIS CONSULTADOS")
        for s, c in sorted(sintomas.items(), key=lambda t: -t[1])[:8]:
            w(f"  {c:>4}x  {s}")

    # -------------------------------------------------------- ODS
    ods = {}
    for f in fichas:
        for o in f["projeto"].get("ods") or []:
            ods[str(o)] = ods.get(str(o), 0) + 1
    if ods:
        w("\nODS ESCOLHIDOS")
        for o, c in sorted(ods.items(), key=lambda t: -t[1]):
            w(f"  ODS {o}: {c} {'equipe' if c == 1 else 'equipes'}")

    # ---------------------------------------- canvas, autoria real
    w("\nCANVAS: QUANTO FOI DE FATO ESCRITO PELA EQUIPE")
    w("  A ferramenta já vem com um exemplo preenchido. Campo não editado não é")
    w("  produção da equipe e não pode ser analisado como tal.")
    intactas = 0
    campos_editados = []
    for f in fichas:
        canvas = f["projeto"].get("canvas") or {}
        editados = sum(1 for k, v in EXEMPLO.items()
                       if str(canvas.get(k, "")).strip() != v)
        campos_editados.append(editados)
        if editados == 0:
            intactas += 1
    total_campos = len(EXEMPLO)
    campos_editados.sort()
    w(f"  Campos editados por equipe, de {total_campos}: mediana "
      f"{campos_editados[len(campos_editados) // 2]}, mínimo {min(campos_editados)}, "
      f"máximo {max(campos_editados)}")
    w(f"  Equipes que não editaram nenhum campo: {intactas} de {n}")
    if intactas:
        w("  Atenção: essas equipes entregaram o exemplo da ferramenta. Exclua da")
        w("  análise de conteúdo e diga isso no artigo.")

    # ---------------------------------------------------- gráficos
    plt.rcParams.update({"font.size": 9, "figure.dpi": 200,
                         "axes.spines.top": False, "axes.spines.right": False})

    fig, ax = plt.subplots(figsize=(4.6, 2.7))
    rot = [ROTULO_PROMPT[k] for k in ROTULO_PROMPT]
    val = [por_prompt[k] for k in ROTULO_PROMPT]
    cores = ["0.45"] * len(val)
    cores[3] = "0.15"  # prompt 4, o andaime de compreensão
    ax.barh(rot[::-1], val[::-1], color=cores[::-1])
    ax.set_xlabel("Cópias registradas")
    fig.tight_layout()
    fig.savefig(os.path.join(AQUI, "fig1_prompts.png"))
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(4.6, 2.7))
    ax.bar(range(1, TOTAL_ETAPAS + 1), por_etapa, color="0.45")
    ax.set_xlabel("Etapa")
    ax.set_ylabel("Equipes")
    ax.set_xticks(range(1, TOTAL_ETAPAS + 1))
    fig.tight_layout()
    fig.savefig(os.path.join(AQUI, "fig2_etapas.png"))
    plt.close(fig)

    texto = "\n".join(out)
    with open(os.path.join(AQUI, "resultados.txt"), "w", encoding="utf-8") as f:
        f.write(texto + "\n")
    print(texto)
    print("\nGerados: resultados.txt, fig1_prompts.png, fig2_etapas.png")


if __name__ == "__main__":
    main()
