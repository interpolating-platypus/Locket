##Server-side

###Node/Express
  |
  |-- client/
  |       |-- app.js
  |       |
  |       +-- index.html
  |       |
  |       +-- assets/
  |       |       |
  |       |
  |       +-- styles/
  |       |       |
  |       |
  |       +-- app/
  |            |-- features/
  |            |        |-- auth/
  |            |        |     |-- auth.html
  |            |        |     +-- auth.js
  |            |        |
  |            |        +-- chat/
  |            |        |     |-- chat.html
  |            |        |     +-- chat.js
  |            |
  |            +-- services/
  |                     |-- authFactory.js
  |                     |
  |                     +-- encryptionFactory.js
  |       
  +-- extension/
  |       |
  |       
  +-- server/
  |       |-- server.js
  |       |
  |       +-- routes.js
  |       |
  |       +-- socketHandler.js
  |       |
  |       |-- features/
  |                 |-- auth/
  |                 |     |-- passport.js
  |                 |
  |                 +-- users/
  |                 |     |-- userController.js
  |                 |     +-- userModel.js
  |                 |     +-- userRoutes.js



