// Conventional Commits com mensagem em português no imperativo: `feat(terrenos): Adiciona gelo`.
// O escopo de uma feature é o nome da spec em docs/specs (sem `.md`).
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // O assunto começa com maiúscula (`Adiciona …`), o que a config padrão proíbe.
    'subject-case': [0],
  },
};
