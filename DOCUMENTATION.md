# Locket

## File Hierarchy
 ``` |
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
  |            |        |     |-- login.html
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
```
## Client-Side
- AngularJS
- Socket.io

## index.js
Configures the Angular app injecting all factories and controllers. Configures the $stateProvider for the different views.

## index.html
Main HTML container for html views. Loads all JavaScript dependencies.

## app/features/auth
### login.html
HTML view for login and signup 

### auth.js
authController for login.html view. Invokes login and signup methods in authFactory

### app/features/chat
### chat.html
HTML view for main chat view. Contains html views for friends list, adding friends, current chat log, and logging out.

### chat.js
chatController to handle all chat and friends activity.

## app/services
### authFactory.js
authFactory to handle all authentication API calls
  - api/users/login
  - api/users/signup
  - api/users/signedin

### encryptionFactory.js
encryptionFactory
  - encryptMessage()
  - decryptMessage()
  - generateOptions() | generates options used for generating a public/private keypair
  - generateKeyPair()

### socketFactory.js
socketFactory returns a socket.io socket to be used to communicate with the server

## Server-Side
- NodeJS
- Express
- PassportJS
- Socket.io
- Mongoose

## server.js
Main server file. Run with node.

## socketHandler.js
Manages socket events and emits.

## features/auth/

### passport.js
Configures PassportJS local strategy

### userController.js
Controller for all user methods

### userModel.js
Defines the user model

### userRoutes.js
Routes for api/users/\*

## Extension
Needed for integrating external chat services