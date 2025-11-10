#!/usr/bin/env python3
"""
Script automático para eliminar duplicatas críticas
"""

import json
from difflib import SequenceMatcher

def load_json(file_path: str):
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(file_path: str, data):
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def calculate_similarity(text1: str, text2: str) -> float:
    return SequenceMatcher(None, text1.lower(), text2.lower()).ratio() * 100

def main():
    print("🔍 Eliminando duplicatas críticas do quiz_database.json...\n")

    # Carregar JSON
    questions = load_json('quiz_database.json')
    print(f"📖 Perguntas originais: {len(questions)}\n")

    # Duplicatas críticas a remover (baseado na análise anterior)
    # Formato: (id_remover, id_manter, similaridade)
    duplicates_to_remove = [
        (151, 130, 97.5, "Supressão eixo HPA - PRATICAMENTE IDÊNTICAS"),
        (190, 4, 91.2, "Efeito adverso local corticosteroides"),
        (182, 40, 92.8, "Efeitos adversos crianças"),
        (179, 61, 92.0, "Mecanismo beta-2 agonistas"),
        (66, 40, 91.2, "Efeitos adversos corticosteroides crianças"),
        (74, 47, 89.1, "Prevenção candidíase oral"),
        (101, 15, 88.5, "Vantagens antagonistas leucotrienos"),
        (96, 1, 87.0, "Mecanismo beta-2 agonistas"),
        (166, 10, 81.8, "Administração IBP em jejum"),
    ]

    print("🗑️  DUPLICATAS A REMOVER:\n")
    ids_to_remove = set()

    for id_remove, id_keep, similarity, description in duplicates_to_remove:
        ids_to_remove.add(id_remove)
        print(f"  ✗ ID {id_remove} (manter ID {id_keep}) - {similarity:.1f}% - {description}")

    print(f"\n📊 Total de duplicatas a remover: {len(ids_to_remove)}\n")

    # Backup
    backup_file = 'quiz_database_backup_before_dedup.json'
    print(f"💾 Criando backup: {backup_file}")
    save_json(backup_file, questions)

    # Filtrar perguntas (remover duplicatas)
    new_questions = []
    removed_count = 0

    for q in questions:
        qid = q.get('id')
        if qid in ids_to_remove:
            removed_count += 1
        else:
            new_questions.append(q)

    # Renumerar IDs sequencialmente
    print(f"\n🔢 Renumerando IDs de {len(new_questions)} perguntas...")
    for i, q in enumerate(new_questions, 1):
        q['id'] = i

    # Salvar
    print(f"💾 Salvando quiz_database.json sem duplicatas...")
    save_json('quiz_database.json', new_questions)

    # Verificar duplicatas restantes
    print(f"\n🔍 Verificando duplicatas restantes (>80% similaridade)...")
    remaining = []
    for i in range(len(new_questions)):
        for j in range(i + 1, len(new_questions)):
            q1_text = new_questions[i].get('pergunta', '')
            q2_text = new_questions[j].get('pergunta', '')

            if not q1_text or not q2_text:
                continue

            sim = calculate_similarity(q1_text, q2_text)
            if sim >= 80:
                remaining.append((
                    new_questions[i]['id'],
                    new_questions[j]['id'],
                    sim
                ))

    # Resumo final
    print("\n" + "="*70)
    print("✅ ELIMINAÇÃO DE DUPLICATAS CONCLUÍDA!")
    print("="*70)
    print(f"  Perguntas originais:     {len(questions)}")
    print(f"  Duplicatas removidas:    {removed_count}")
    print(f"  Perguntas finais:        {len(new_questions)}")
    print(f"  Redução:                 {removed_count/len(questions)*100:.1f}%")
    print(f"  Backup salvo em:         {backup_file}")

    if remaining:
        print(f"\n⚠️  Duplicatas restantes (>80%): {len(remaining)}")
        print("\n  Top 10 mais similares:")
        for id1, id2, sim in sorted(remaining, key=lambda x: x[2], reverse=True)[:10]:
            q1 = next((q for q in new_questions if q['id'] == id1), {})
            q2 = next((q for q in new_questions if q['id'] == id2), {})
            print(f"    ID {id1} vs ID {id2}: {sim:.1f}%")
            print(f"      {q1.get('pergunta', '')[:80]}...")
            print(f"      {q2.get('pergunta', '')[:80]}...")
    else:
        print("\n✅ Nenhuma duplicata crítica restante (>80%)!")

    print("="*70)

    # Estatísticas finais
    print("\n📊 ESTATÍSTICAS FINAIS:\n")

    # Por tipo
    types = {}
    for q in new_questions:
        t = q.get('tipo', 'não definido')
        types[t] = types.get(t, 0) + 1

    print("  Tipos de perguntas:")
    for t, count in sorted(types.items()):
        print(f"    {t}: {count}")

    # Por dificuldade
    difficulties = {}
    for q in new_questions:
        d = q.get('dificuldade', 'não definido')
        difficulties[d] = difficulties.get(d, 0) + 1

    print("\n  Dificuldade:")
    for d in ['fácil', 'médio', 'difícil']:
        count = difficulties.get(d, 0)
        pct = (count / len(new_questions)) * 100
        print(f"    {d.capitalize()}: {count} ({pct:.1f}%)")

    print()

if __name__ == '__main__':
    main()
