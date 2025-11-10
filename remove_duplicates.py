#!/usr/bin/env python3
"""
Script para identificar e eliminar perguntas duplicadas
Baseado na análise de similaridade já realizada
"""

import json
from difflib import SequenceMatcher

def calculate_similarity(text1: str, text2: str) -> float:
    """Calcula similaridade entre dois textos"""
    return SequenceMatcher(None, text1.lower(), text2.lower()).ratio() * 100

def load_json(file_path: str):
    """Carrega JSON"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(file_path: str, data):
    """Salva JSON"""
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def find_duplicates(questions, threshold=80):
    """
    Encontra perguntas duplicadas acima do threshold de similaridade
    Retorna lista de pares (id1, id2, similaridade)
    """
    duplicates = []
    n = len(questions)

    for i in range(n):
        for j in range(i + 1, n):
            q1 = questions[i].get('pergunta', '')
            q2 = questions[j].get('pergunta', '')

            if not q1 or not q2:
                continue

            similarity = calculate_similarity(q1, q2)

            if similarity >= threshold:
                id1 = questions[i].get('id', i + 1)
                id2 = questions[j].get('id', j + 1)
                duplicates.append((id1, id2, similarity))

    return sorted(duplicates, key=lambda x: x[2], reverse=True)

def merge_best_features(q1, q2):
    """
    Mescla as melhores características de duas perguntas duplicadas
    Escolhe a melhor justificativa, opções, etc.
    """
    # Usar a pergunta mais detalhada
    pergunta1 = q1.get('pergunta', '')
    pergunta2 = q2.get('pergunta', '')

    merged = q1.copy()

    # Escolher justificativa mais longa (geralmente mais detalhada)
    just1 = q1.get('justificativa', '')
    just2 = q2.get('justificativa', '')
    if len(just2) > len(just1):
        merged['justificativa'] = just2

    # Escolher dica mais detalhada
    dica1 = q1.get('dica', '')
    dica2 = q2.get('dica', '')
    if len(dica2) > len(dica1):
        merged['dica'] = dica2

    return merged

def main():
    print("🔍 Analisando duplicatas no quiz_database.json...\n")

    # Carregar JSON
    questions = load_json('quiz_database.json')
    print(f"📖 {len(questions)} perguntas carregadas\n")

    # Encontrar duplicatas
    print("🔎 Procurando duplicatas (similaridade >= 80%)...")
    duplicates = find_duplicates(questions, threshold=80)

    if not duplicates:
        print("✓ Nenhuma duplicata encontrada!")
        return

    print(f"⚠️  Encontradas {len(duplicates)} pares de duplicatas:\n")

    # Duplicatas críticas definidas manualmente baseadas na análise anterior
    critical_duplicates = [
        # ID1, ID2, Similaridade, Ação
        (130, 151, 97.5, "remover"),  # PRATICAMENTE IDÊNTICAS
        (4, 190, 91.2, "remover"),
        (40, 182, 92.8, "remover"),
        (61, 179, 92.0, "remover"),
        (40, 66, 91.2, "remover"),
        (47, 74, 89.1, "mesclar"),
        (1, 61, 88.1, "mesclar"),
        (15, 101, 88.5, "mesclar"),
    ]

    # Mostrar duplicatas críticas
    print("🚨 DUPLICATAS CRÍTICAS (>88% similaridade):")
    for id1, id2, sim, action in critical_duplicates:
        q1 = questions[id1-1].get('pergunta', '')[:80]
        q2 = questions[id2-1].get('pergunta', '')[:80]
        print(f"\n  ID {id1} vs ID {id2} ({sim:.1f}% similar) - Ação: {action}")
        print(f"    {id1}: {q1}...")
        print(f"    {id2}: {q2}...")

    # Perguntar confirmação
    print("\n" + "="*70)
    print("ESTRATÉGIA DE REMOÇÃO:")
    print("="*70)

    # IDs a remover (manter o primeiro, remover o segundo)
    ids_to_remove = [151, 190, 182, 179, 66]

    print(f"\n📋 Serão REMOVIDOS os seguintes IDs duplicados:")
    for qid in ids_to_remove:
        q = questions[qid-1]
        pergunta = q.get('pergunta', '')[:100]
        print(f"  • ID {qid}: {pergunta}...")

    print(f"\n📋 Serão MANTIDOS e possivelmente MESCLADOS:")
    ids_to_keep = [130, 4, 40, 61, 47, 1, 15]
    for qid in ids_to_keep:
        q = questions[qid-1]
        pergunta = q.get('pergunta', '')[:100]
        print(f"  • ID {qid}: {pergunta}...")

    print("\n" + "="*70)
    response = input("\nDeseja prosseguir com a remoção? (s/n): ")

    if response.lower() != 's':
        print("❌ Operação cancelada pelo usuário")
        return

    # Remover duplicatas
    print("\n🗑️  Removendo duplicatas...")

    # Criar nova lista sem as duplicatas
    new_questions = []
    removed_count = 0

    for i, q in enumerate(questions):
        qid = q.get('id', i + 1)

        if qid in ids_to_remove:
            removed_count += 1
            print(f"  ✓ Removido ID {qid}")
        else:
            new_questions.append(q)

    # Renumerar IDs
    print("\n🔢 Renumerando IDs sequencialmente...")
    for i, q in enumerate(new_questions, 1):
        old_id = q.get('id', 0)
        q['id'] = i
        if old_id != i:
            print(f"  ID {old_id} → {i}")

    # Salvar
    backup_file = 'quiz_database_backup.json'
    print(f"\n💾 Salvando backup em {backup_file}...")
    save_json(backup_file, questions)

    print(f"💾 Salvando nova versão em quiz_database.json...")
    save_json('quiz_database.json', new_questions)

    # Resumo
    print("\n" + "="*70)
    print("✅ REMOÇÃO DE DUPLICATAS CONCLUÍDA!")
    print("="*70)
    print(f"  Perguntas originais: {len(questions)}")
    print(f"  Perguntas removidas: {removed_count}")
    print(f"  Perguntas restantes: {len(new_questions)}")
    print(f"  Backup salvo em:     {backup_file}")
    print("="*70)

    # Verificar se ainda há duplicatas
    print("\n🔍 Verificando se ainda há duplicatas...")
    remaining_duplicates = find_duplicates(new_questions, threshold=85)

    if remaining_duplicates:
        print(f"⚠️  Ainda existem {len(remaining_duplicates)} pares com >85% similaridade:")
        for id1, id2, sim in remaining_duplicates[:10]:
            print(f"  • ID {id1} vs ID {id2}: {sim:.1f}%")
    else:
        print("✅ Nenhuma duplicata crítica restante!")

if __name__ == '__main__':
    main()
