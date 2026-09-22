import { baseConfig } from '@barff/config/eslint/base';

export default [
  ...baseConfig,
  {
    rules: {
      /**
       * `consistent-type-imports` bu yerda O'CHIRILGAN — u NestJS ni buzadi.
       *
       * Nest DI konstruktor parametrlarining tipini `emitDecoratorMetadata`
       * chiqaradigan `design:paramtypes` orqali RUNTIME da o'qiydi. `import
       * type` esa kompilyatsiyada butunlay o'chiriladi, natijada metadata'da
       * klass o'rniga `Function` qoladi va ilova ishga tushishda quladi:
       *   "Nest can't resolve dependencies of the RedisService (?)".
       *
       * Eng xavflisi — lint va typecheck bunda YASHIL bo'lib qolaveradi,
       * xato faqat API ko'tarilganda chiqadi. `--fix` bu qoidani avtomatik
       * "tuzatib", kodni jim buzib qo'yishi mumkin edi.
       */
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
