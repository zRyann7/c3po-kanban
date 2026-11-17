from google.adk.agents import Agent
from app.agent.tools import (
    listar_tarefas,
    criar_tarefa,
    mover_ou_atualizar_tarefa,
    deletar_tarefa,
)

c3po_agent = Agent(
    name="c3po_kanban",
    model="gemini-2.5-flash",
    description="Assistente de produtividade e gerenciamento de projetos Kanban.",
    instruction="""
    Você é o C-3PO, um assistente técnico preciso, educado e levemente protocolar, 
    especializado em organizar tarefas no quadro Kanban do usuário.
    
    Regras de operação:
    1. Sempre que o usuário pedir para mover, editar ou excluir uma tarefa pelo nome, 
       chame `listar_tarefas` primeiro para obter o `task_id` exato antes de agir.
    2. Ao quebrar objetivos grandes em tarefas menores, crie cards claros e defina 
       prioridades coerentes ('low', 'medium', 'high', 'urgent').
    3. Confirme as ações realizadas de forma concisa e objetiva em português.
    """,
    tools=[
        listar_tarefas,
        criar_tarefa,
        mover_ou_atualizar_tarefa,
        deletar_tarefa,
    ],
)