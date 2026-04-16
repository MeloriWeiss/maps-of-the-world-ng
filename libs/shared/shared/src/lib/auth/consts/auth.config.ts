export const authConfig = {
  password: {
    minLength: {
      value: 6,
      message: 'Пароль должен содержать не менее 6 символов',
    },
    maxLength: {
      value: 30,
      message: 'Пароль должен содержать не более 30 символов',
    },
    hasUppercase: {
      pattern: /[A-Z]/,
      message: 'Пароль должен содержать хотя бы одну заглавную букву',
    },
    required: {
      message: 'Введите пароль',
    },
    errorName: 'validatePassword',
  },
  username: {
    minLength: {
      value: 3,
      message: 'username должен содержать не менее 3 символов',
    },
    maxLength: {
      value: 30,
      message: 'username должен содержать не более 30 символов',
    },
    required: {
      message: 'Введите username',
    },
    errorName: 'validateUsername',
  },
  email: {
    correct: {
      pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      message: 'Введите корректную почту',
    },
    maxLength: {
      value: 50,
      message: 'Почта должна содержать не более 50 символов',
    },
    required: {
      message: 'Введите почту',
    },
    errorName: 'validateEmail',
  },
};
