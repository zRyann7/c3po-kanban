from typing import Optional
from google.adk.tools import ToolContext
from firebase_admin import firestore
from app.firebase_db import db


def _user_tasks_ref(user_id: str):
    return db.collection("users").document(user_id).collection("tasks")


def listar_tarefas(
    tool_context: ToolContext,
    status: Optional[str] = None
) -> dict:
    """
    Lista as tarefas atuais do usuário no quadro Kanban.
    
    Args:
        status: Filtro opcional de coluna ('todo', 'in_progress', 'done').
    """
    user_id = tool_context.state.get("user_id")
    if not user_id:
        return {"status": "error", "message": "Usuário não autenticado na sessão."}

    ref = _user_tasks_ref(user_id)
    if status in ("todo", "in_progress", "done"):
        query = ref.where("status", "==", status).order_by("position")
    else:
        query = ref.order_by("position")

    tasks = []
    for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
        for field in ("created_at", "updated_at"):
            if data.get(field):
                data[field] = str(data[field])
        tasks.append(data)

    return {"status": "success", "tasks": tasks}


def criar_tarefa(
    title: str,
    tool_context: ToolContext,
    description: Optional[str] = None,
    status: str = "todo",
    priority: str = "medium",
    tags: Optional[list[str]] = None
) -> dict:
    """
    Cria uma nova tarefa (card) no quadro Kanban do usuário.
    
    Args:
        title: Título curto e objetivo da tarefa.
        description: Detalhes ou critérios de aceite da tarefa.
        status: Coluna inicial ('todo', 'in_progress', 'done'). Padrão: 'todo'.
        priority: Nível de urgência ('low', 'medium', 'high', 'urgent'). Padrão: 'medium'.
        tags: Lista de etiquetas (ex: ['backend', 'bug']).
    """
    user_id = tool_context.state.get("user_id")
    if not user_id:
        return {"status": "error", "message": "Usuário não autenticado na sessão."}

    ref = _user_tasks_ref(user_id)
    last_docs = list(ref.order_by("position", direction=firestore.Query.DESCENDING).limit(1).stream())
    next_position = (last_docs[0].to_dict().get("position", 0) + 1000.0) if last_docs else 1000.0

    payload = {
        "title": title,
        "description": description or "",
        "status": status if status in ("todo", "in_progress", "done") else "todo",
        "priority": priority if priority in ("low", "medium", "high", "urgent") else "medium",
        "position": next_position,
        "tags": tags or [],
        "created_by_agent": True,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP,
    }

    _, doc_ref = ref.add(payload)
    return {
        "status": "success",
        "task": {"id": doc_ref.id, "title": title, "status": payload["status"], "priority": payload["priority"]}
    }


def mover_ou_atualizar_tarefa(
    task_id: str,
    tool_context: ToolContext,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    title: Optional[str] = None,
    description: Optional[str] = None
) -> dict:
    """
    Atualiza dados ou move uma tarefa existente para outra coluna do Kanban.
    
    Args:
        task_id: ID do documento da tarefa no Firestore.
        status: Nova coluna ('todo', 'in_progress', 'done').
        priority: Nova prioridade ('low', 'medium', 'high', 'urgent').
        title: Novo título, caso precise renomear.
        description: Nova descrição.
    """
    user_id = tool_context.state.get("user_id")
    if not user_id:
        return {"status": "error", "message": "Usuário não autenticado na sessão."}

    doc_ref = _user_tasks_ref(user_id).document(task_id)
    if not doc_ref.get().exists:
        return {"status": "error", "message": "Tarefa não encontrada."}

    updates = {"updated_at": firestore.SERVER_TIMESTAMP}
    if status in ("todo", "in_progress", "done"):
        updates["status"] = status
    if priority in ("low", "medium", "high", "urgent"):
        updates["priority"] = priority
    if title:
        updates["title"] = title
    if description is not None:
        updates["description"] = description

    doc_ref.update(updates)
    return {"status": "success", "updated_id": task_id, "changes": list(updates.keys())}


def deletar_tarefa(task_id: str, tool_context: ToolContext) -> dict:
    """
    Remove permanentemente uma tarefa do quadro Kanban.
    
    Args:
        task_id: ID do documento da tarefa a ser removida.
    """
    user_id = tool_context.state.get("user_id")
    if not user_id:
        return {"status": "error", "message": "Usuário não autenticado na sessão."}

    doc_ref = _user_tasks_ref(user_id).document(task_id)
    if not doc_ref.get().exists:
        return {"status": "error", "message": "Tarefa não encontrada."}

    doc_ref.delete()
    return {"status": "success", "deleted_id": task_id}