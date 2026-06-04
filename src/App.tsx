/* eslint-disable max-len */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useState, useRef } from 'react';
import clsx from 'clsx';

import { USER_ID, getTodos, addTodos, deleteTodos } from './api/todos';
import { Todo } from './types/Todo';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [filter, setFilter] = useState('All');

  const [inProcess, setInProcess] = useState(false);
  const [targetId, setTargetId] = useState<number[]>([]);

  const [tempTodo, setTempTodo] = useState<Todo | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  let countUnCompletedTodos = 0;

  function handleErrorMessage(message: string) {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setErrorMessage(message);

    timerRef.current = setTimeout(() => setErrorMessage(''), 3000);
  }

  useEffect(() => {
    getTodos()
      .then(value => {
        setTodos(value);
      })
      .catch(() => {
        handleErrorMessage('Unable to load todos');
      });
  }, []);

  useEffect(() => {
    if (!inProcess) {
      inputRef.current?.focus();
    }
  }, [inProcess]);

  function deleteTodo(todoID: number) {
    if (inProcess) {
      return;
    }

    setInProcess(true);

    setTargetId(currentTargetIds => [...currentTargetIds, todoID]);

    deleteTodos(todoID)
      .then(() => {
        setTodos(currentTodos =>
          currentTodos.filter(todo => todo.id !== todoID),
        );
      })
      .catch(() => handleErrorMessage('Unable to delete a todo'))
      .finally(() => {
        setTargetId([]);
        setInProcess(false);
      });
  }

  function handleClearComplited() {
    const completedTodos = todos.filter(todo => todo.completed);

    setTargetId(completedTodos.map(todo => todo.id));

    setInProcess(true);

    Promise.allSettled(completedTodos.map(todo => deleteTodos(todo.id)))
      .then(results => {
        const isSend = results.map((result, index) => {
          if (result.status === 'fulfilled') {
            return completedTodos[index].id;
          }

          return;
        });

        setTodos(currentTodos => {
          return currentTodos.filter(todo => !isSend.includes(todo.id));
        });

        results.forEach(result => {
          if (result.status === 'rejected') {
            handleErrorMessage('Unable to delete a todo');
          }
        });
      })
      .finally(() => {
        setTargetId([]);
        setInProcess(false);
      });
  }

  function createTodo() {
    const temporaryTodo: Todo = {
      id: 0,
      userId: USER_ID,
      title,
      completed: false,
    };

    setTempTodo(temporaryTodo);

    const newItem: Omit<Todo, 'id'> = {
      userId: USER_ID,
      title: title.trim(),
      completed: false,
    };

    return addTodos(newItem)
      .then(response => {
        setTodos(currentTodos => [...currentTodos, response]);
        setTitle('');
        setTempTodo(null);
      })
      .catch(() => handleErrorMessage('Unable to add a todo'))
      .finally(() => {
        setTempTodo(null);
      });
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (inProcess) {
      return;
    }

    if (title.trim() === '') {
      handleErrorMessage('Title should not be empty');

      return;
    }

    setInProcess(true);

    createTodo().then(() => setInProcess(false));
  };

  const isCompleted = todos.some(todo => todo.completed);

  const visibleTodos = todos.filter(todo => {
    if (!todo.completed) {
      countUnCompletedTodos++;
    }

    if (filter === 'Active') {
      return todo.completed === false;
    }

    if (filter === 'Completed') {
      return todo.completed === true;
    }

    return true;
  });

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {/* this button should have `active` class only if all todos are completed */}
          <button
            type="button"
            className="todoapp__toggle-all active"
            data-cy="ToggleAllButton"
          />

          {/* Add a todo on form submit */}
          <form onSubmit={handleSubmit}>
            <input
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              onChange={e => setTitle(e.target.value)}
              value={title}
              ref={inputRef}
              disabled={inProcess}
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          {todos.length !== 0 &&
            visibleTodos.map(todo => {
              return (
                <div
                  key={todo.id}
                  data-cy="Todo"
                  className={clsx('todo', todo.completed && 'completed')}
                >
                  <label className="todo__status-label">
                    <input
                      data-cy="TodoStatus"
                      type="checkbox"
                      className="todo__status"
                      checked={todo.completed}
                    />
                  </label>

                  <span data-cy="TodoTitle" className="todo__title">
                    {todo.title}
                  </span>

                  {/* Remove button appears only on hover */}
                  <button
                    type="button"
                    className="todo__remove"
                    data-cy="TodoDelete"
                    onClick={() => deleteTodo(todo.id)}
                  >
                    ×
                  </button>

                  {/* overlay will cover the todo while it is being deleted or updated */}
                  <div
                    data-cy="TodoLoader"
                    className={clsx(
                      'modal',
                      'overlay',
                      targetId.includes(todo.id) && 'is-active',
                    )}
                  >
                    <div
                      id="plug"
                      className="modal-background has-background-white-ter"
                    />
                    <div className="loader" />
                  </div>
                </div>
              );
            })}

          {tempTodo && (
            <div key={tempTodo.id} data-cy="Todo" className="todo">
              <label className="todo__status-label">
                <input
                  data-cy="TodoStatus"
                  type="checkbox"
                  className="todo__status"
                  checked={tempTodo.completed}
                />
              </label>

              <span data-cy="TodoTitle" className="todo__title">
                {tempTodo.title}
              </span>

              {/* Remove button appears only on hover */}
              <button
                type="button"
                className="todo__remove"
                data-cy="TodoDelete"
              >
                ×
              </button>

              {/* overlay will cover the todo while it is being deleted or updated */}
              <div data-cy="TodoLoader" className="modal overlay is-active">
                <div
                  id="plug"
                  className="modal-background has-background-white-ter"
                />
                <div className="loader" />
              </div>
            </div>
          )}
        </section>

        {/* Hide the footer if there are no todos */}
        {todos.length !== 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {countUnCompletedTodos} items left
            </span>

            {/* Active link should have the 'selected' class */}
            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={clsx('filter__link', filter === 'All' && 'selected')}
                data-cy="FilterLinkAll"
                onClick={() => setFilter('All')}
              >
                All
              </a>

              <a
                href="#/active"
                className={clsx(
                  'filter__link',
                  filter === 'Active' && 'selected',
                )}
                data-cy="FilterLinkActive"
                onClick={() => setFilter('Active')}
              >
                Active
              </a>

              <a
                href="#/completed"
                className={clsx(
                  'filter__link',
                  filter === 'Completed' && 'selected',
                )}
                data-cy="FilterLinkCompleted"
                onClick={() => setFilter('Completed')}
              >
                Completed
              </a>
            </nav>

            {/* this button should be disabled if there are no completed todos */}
            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={!isCompleted}
              onClick={handleClearComplited}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      {/* DON'T use conditional rendering to hide the notification */}
      {/* Add the 'hidden' class to hide the message smoothly */}
      <div
        data-cy="ErrorNotification"
        className={clsx(
          'notification',
          'is-danger is-light',
          'has-text-weight-normal',
          errorMessage === '' && 'hidden',
        )}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={() => {
            if (timerRef.current) {
              clearTimeout(timerRef.current);
              setErrorMessage('');
            }
          }}
        />
        {errorMessage}
      </div>
    </div>
  );
};
