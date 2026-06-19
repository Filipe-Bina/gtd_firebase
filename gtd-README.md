# GTD-Ability Tecnologia — Firebase

Sistema migrado do Supabase para Firebase (Firestore + Auth + Hosting).

## Estrutura de arquivos

```
gtd-firebase/
├── index.html         ← Página principal
├── app.js             ← Lógica completa (ES Modules)
├── styles.css         ← Estilos (mesmo do original)
├── firebase.json      ← Configuração do Firebase Hosting
├── firestore.rules    ← Regras de segurança do Firestore
├── assets/
│   └── codigos-baixa.pdf  ← PDF de códigos (copie o original)
└── README.md
```

## Deploy no Firebase Hosting

### 1. Instalar o Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Fazer login no Firebase

```bash
firebase login
```

### 3. Inicializar o projeto (na pasta do projeto)

```bash
firebase use gtd-ability-tecnologia
```

### 4. Aplicar regras do Firestore

```bash
firebase deploy --only firestore:rules
```

### 5. Fazer o deploy do site

```bash
firebase deploy --only hosting
```

O site ficará disponível em:
- https://gtd-ability-tecnologia.web.app
- https://gtd-ability-tecnologia.firebaseapp.com

## Migrar dados do Supabase para Firestore

### Técnicos autorizados (allowed_technicians)
No Firestore, crie a coleção `allowed_technicians` com documentos
cujo ID é o RE do técnico:

```
allowed_technicians/
  30981/  { re: "30981", name: "ANDERSON PEDRO DE SOUZA", role: "tecnico" }
  32965/  { re: "32965", name: "FÁBIO APARECIDO ALVES", role: "tecnico" }
  ...
```

### Admins autorizados (allowed_admins)
```
allowed_admins/
  12345678900/  { cpf: "12345678900", name: "NOME DO ADMIN", level: "admin", role: "administrador" }
```

## Diferenças em relação ao sistema original

- Login usa Firebase Auth (email virtual interno: re12345@gtdability.internal)
- Banco de dados: Firestore (NoSQL) no lugar do PostgreSQL
- Sem funções serverless — toda a lógica roda no frontend com regras de segurança
- Realtime via onSnapshot do Firestore
