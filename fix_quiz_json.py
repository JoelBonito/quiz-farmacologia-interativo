#!/usr/bin/env python3
"""
Script para corrigir e aprimorar o quiz_database.json
- Mesclar campos duplicados
- Corrigir formatos de perguntas
- Adicionar campo difficulty
- Adicionar campo category
- Padronizar para português
- Revisar questões específicas
"""

import json
import re
from typing import Dict, List, Any

def load_json(file_path: str) -> List[Dict[str, Any]]:
    """Carrega o arquivo JSON"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(file_path: str, data: List[Dict[str, Any]]):
    """Salva o arquivo JSON formatado"""
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def standardize_fields_to_portuguese(question: Dict[str, Any]) -> Dict[str, Any]:
    """Padroniza todos os campos para português"""
    field_mapping = {
        'question': 'pergunta',
        'type': 'tipo',
        'options': 'opcoes',
        'correct_answer': 'resposta_correta',
        'explanation': 'justificativa',
        'hint': 'dica',
        'topic': 'topico',
        'subtopic': 'subtopico'
    }

    new_question = {}

    # Mesclar campos duplicados (priorizar português)
    for pt_field, en_field in [(v, k) for k, v in field_mapping.items()]:
        if pt_field in question:
            new_question[pt_field] = question[pt_field]
        elif en_field in question:
            new_question[pt_field] = question[en_field]

    # Copiar campos que não têm tradução
    for key in question:
        if key not in field_mapping and key not in field_mapping.values():
            if key not in new_question:
                new_question[key] = question[key]

    return new_question

def determine_difficulty(question: Dict[str, Any]) -> str:
    """
    Determina o nível de dificuldade baseado em critérios:
    - Fácil: Perguntas V/F simples, conceitos básicos
    - Médio: Múltipla escolha com mecanismos de ação, indicações
    - Difícil: Casos clínicos, interações, doses específicas, múltiplos conceitos
    """
    pergunta_text = question.get('pergunta', question.get('question', '')).lower()
    tipo = question.get('tipo', question.get('type', ''))
    justificativa = question.get('justificativa', question.get('explanation', '')).lower()

    # Critérios para difícil
    difficult_keywords = [
        'caso clínico', 'paciente', 'dose', 'interação', 'metabolismo',
        'cyp', 'farmacocinética', 'janela terapêutica', 'biodisponibilidade',
        'clearance', 'meia-vida', 'ajuste de dose', 'insuficiência',
        'contraindicação absoluta', 'monitorização', 'toxicidade'
    ]

    # Critérios para fácil
    easy_keywords = [
        'qual é o principal', 'define-se', 'característica principal',
        'principal função', 'principal objetivo'
    ]

    # Casos clínicos são sempre difíceis
    if tipo in ['clinical_case', 'caso_clinico']:
        return 'difícil'

    # V/F tendem a ser fáceis, exceto se tiverem palavras-chave difíceis
    if tipo in ['true_false', 'verdadeiro_falso']:
        if any(keyword in pergunta_text or keyword in justificativa for keyword in difficult_keywords):
            return 'médio'
        return 'fácil'

    # Verificar palavras-chave difíceis
    if any(keyword in pergunta_text or keyword in justificativa for keyword in difficult_keywords):
        return 'difícil'

    # Verificar palavras-chave fáceis
    if any(keyword in pergunta_text for keyword in easy_keywords):
        return 'fácil'

    # Perguntas longas ou com justificativas longas tendem a ser médias/difíceis
    if len(pergunta_text) > 200 or len(justificativa) > 250:
        return 'médio'

    # Default: médio
    return 'médio'

def fix_question(question: Dict[str, Any], question_id: int) -> Dict[str, Any]:
    """Aplica todas as correções necessárias"""

    # 1. Padronizar campos para português
    question = standardize_fields_to_portuguese(question)

    # 2. Correções específicas por ID

    # IDs 179 e 181: Reduzir de 5 para 4 opções
    if question_id in [179, 181]:
        if 'opcoes' in question and len(question['opcoes']) == 5:
            # Remover a opção E (última)
            question['opcoes'] = question['opcoes'][:4]
            print(f"  ✓ ID {question_id}: Reduzido de 5 para 4 opções")

    # IDs 89 e 95: Mudar type para true_false
    if question_id in [89, 95]:
        question['tipo'] = 'true_false'
        # Garantir que tem apenas opções V/F
        if 'opcoes' in question:
            del question['opcoes']
        print(f"  ✓ ID {question_id}: Tipo alterado para true_false")

    # IDs 191-198: Padronizar para Verdadeiro/Falso
    if 191 <= question_id <= 198:
        resposta = question.get('resposta_correta', '')
        if resposta == 'V':
            question['resposta_correta'] = 'Verdadeiro'
            print(f"  ✓ ID {question_id}: Resposta V → Verdadeiro")
        elif resposta == 'F':
            question['resposta_correta'] = 'Falso'
            print(f"  ✓ ID {question_id}: Resposta F → Falso")

    # ID 80: Revisar asma induzida por exercício
    if question_id == 80:
        # Adicionar nota na justificativa sobre alternativa
        justificativa_atual = question.get('justificativa', '')
        if 'salbutamol pré-exercício' not in justificativa_atual.lower():
            question['justificativa'] = (
                f"{justificativa_atual} "
                "Nota: Salbutamol pré-exercício também é considerado primeira linha "
                "por muitas diretrizes, sendo montelucaste uma alternativa igualmente válida "
                "para pacientes que preferem medicação oral regular."
            ).strip()
            print(f"  ✓ ID {question_id}: Justificativa complementada")

    # ID 92: Revisar antagonistas H2 e glaucoma
    if question_id == 92:
        # Verificar se há erro conceitual
        pergunta = question.get('pergunta', '')
        if 'glaucoma' in pergunta.lower() and 'antagonistas h2' in pergunta.lower():
            # Corrigir a resposta se necessário
            # Esta contraindicação é típica de anticolinérgicos, não H2
            print(f"  ⚠ ID {question_id}: REVISAR - Antagonistas H2 não têm contraindicação em glaucoma")
            question['needs_review'] = True

    # 3. Adicionar campo difficulty
    if 'difficulty' not in question and 'dificuldade' not in question:
        difficulty = determine_difficulty(question)
        question['dificuldade'] = difficulty

    # 4. Adicionar campo category
    if 'category' not in question and 'categoria' not in question:
        question['categoria'] = 'Farmacologia'

    # 5. Garantir que tipo está em português
    type_mapping = {
        'multiple_choice': 'multipla_escolha',
        'true_false': 'verdadeiro_falso',
        'clinical_case': 'caso_clinico'
    }

    if 'tipo' in question:
        tipo_atual = question['tipo']
        if tipo_atual in type_mapping:
            question['tipo'] = type_mapping[tipo_atual]

    return question

def main():
    print("🔧 Iniciando correções no quiz_database.json...\n")

    # Carregar JSON
    print("📖 Carregando arquivo...")
    questions = load_json('quiz_database.json')
    print(f"✓ {len(questions)} perguntas carregadas\n")

    # Aplicar correções
    print("🔨 Aplicando correções:\n")

    fixed_questions = []
    for i, question in enumerate(questions, start=1):
        fixed_question = fix_question(question, i)
        fixed_questions.append(fixed_question)

    # Salvar JSON corrigido
    print("\n💾 Salvando arquivo corrigido...")
    save_json('quiz_database.json', fixed_questions)
    print("✓ Arquivo salvo com sucesso!\n")

    # Estatísticas de dificuldade
    print("📊 Estatísticas de Dificuldade:")
    difficulty_counts = {'fácil': 0, 'médio': 0, 'difícil': 0}
    for q in fixed_questions:
        diff = q.get('dificuldade', 'médio')
        difficulty_counts[diff] = difficulty_counts.get(diff, 0) + 1

    total = len(fixed_questions)
    for diff, count in difficulty_counts.items():
        percentage = (count / total) * 100
        print(f"  {diff.capitalize()}: {count} ({percentage:.1f}%)")

    print("\n✅ Correções concluídas com sucesso!")

    # Verificar se há perguntas que precisam revisão manual
    needs_review = [i+1 for i, q in enumerate(fixed_questions) if q.get('needs_review')]
    if needs_review:
        print(f"\n⚠️  Perguntas que precisam revisão manual: {needs_review}")

if __name__ == '__main__':
    main()
