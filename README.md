
# Proyecto - XMPP - Redes

## Características del proyecto

El presente proyecto consta de implementar una mensajería instantánea con soporte del protocolo XMPP(eXtensible Messging and Presence Protocol) para lograr establecer la interconexión de distintos clientes. Se busca implementar un protocolo en base a los estándares establecidos y lograr comprender tanto el propósito del protocolo XMPP como el funcionamiento de los servicios de este protocolo, además de lograr entender las bases de la programación asíncrona.

## Funcionalidades implementadas

### Administración de cuentas (20% del funcionamiento, 5% cada funcionalidad)

1. Registrar una nueva cuenta en el servidor ✅
2. Iniciar sesión con una cuenta ✅
3. Cerrar sesión con una cuenta ✅
4. Eliminar la cuenta del servidor ✅

### Comunicación (80% del funcionamiento, 10% cada funcionalidad)

1. Mostrar todos los usuarios/contactos y su estado ✅
2. Agregar un usuario a los contactos ✅
3. Mostrar detalles de contacto de un usuario ✅
4. Comunicación 1 a 1 con cualquier usuario/contacto ✅
5. Participar en conversaciones grupales ✅
6. Definir mensaje de presencia ✅
7. Enviar/recibir notificaciones ✅
8. Enviar/recibir archivos ✅

## Uso del código

#### Para instalar las librerías dependientes del proyecto
```
npm install
```

#### Para correr el programa
```
npm start
```
o 
```
node --no-warnings index.js       
```
 
## Puntos a considerar
-  Para crear cuenta ingrese su nombre de usuario, no nombre@alumchat.xyz cuando se le solicite.
-  Para iniciar sesión ingrese su nombre de usuario, no nombre@alumchat.xyz cuando se le solicite.
-  Si desea enviar un mensaje a un usuario ingrese el nombre del usuario solamente, no nombre@alumchat.xyz.
- Si desearas unirte a unirte ingresa solamente el nombre del grupo cuando lo solicite.
