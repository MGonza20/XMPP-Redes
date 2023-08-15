const { client, xml } = require("@xmpp/client");
const readline = require('readline-sync');
const net = require('net');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const getUserInfo = () => {
  let username = readline.question('Enter your username: ');
  let password = readline.question('Enter your password: ');
  // let username = 'pag20634';
  // let password = '1234';
  return { username, password };
}

const mainMenu = () => {
  console.log('\n--------------------   Main Menu   --------------------\n1. Login\n2. Register\n3. Exit\n')
  let selectedOption = readline.question('Select a menu option: ');
  return selectedOption;
}


const showMenuOptions = () => {
  console.log('\n--------------------   Menu   --------------------\n1. Show contacts and status\n2. Add user to contacts\n3. Mostrar detalles de contacto de un usuario\n4. Chat one to one with user\n5. Participar en conversaciones grupales\n6. Definir mensaje de presencia\n7. Enviar/recibir notificaciones\n8. Enviar/recibir archivo\n9. Logout\n')
}

const login = async (xmpp) => {
  return new Promise((resolve, reject) => {
    xmpp.on("online", async () => {
      await xmpp.send(xml("presence"));
      
      while (true) {
        showMenuOptions();
        
        let selectedOption = readline.question('Select a menu option (9 to exit): ');
        switch (selectedOption) {
          case '1':
            console.log('Not implemented yet.');
            break;
          case '2':
            console.log('Not implemented yet.');
            break;
          case '3':
            console.log('Not implemented yet.');
            break;
          case '4':
            console.log('Not implemented yet.');
            break;
          case '5':
            console.log('Not implemented yet.');
            break;
          case '6':
            console.log('Not implemented yet.');
            break;
          case '7':
            console.log('Not implemented yet.');
            break;
          case '8':
            console.log('Not implemented yet.');
            break;
          case '9':
            console.log('Logging out...');
            xmpp.stop();
            return;
          default:
            console.log('Invalid option. Try again.');
        }
      }
    });

    xmpp.on("error", (err) => {
      if (err.toString().includes("not-authorized")) { 
        console.log('Incorrect username or password. Try again.\n');
        xmpp.stop().then(resolve);
      }
    });
    
    xmpp.start().catch(() => {});
  })
};

const register = (username, password) => {
  return new Promise((resolve, reject) => {
    const HOST = 'alumchat.xyz';
    const PORT = 5222;

    const socket = new net.Socket();
    socket.on('data', (data) => {
      if (data.toString().includes('<stream:features')) {
        if (data.toString().includes('http://jabber.org/features/iq-register')) {
          const registerIq = `<iq type='set' id='reg_1'>
                                    <query xmlns='jabber:iq:register'>
                                      <username>${username}</username>
                                      <password>${password}</password>
                                    </query>
                                  </iq>`;
          socket.write(registerIq);
        }
      } else if (data.toString().includes('type="result"') && data.toString().includes('id="reg_1"')) {
        console.log('Successful register!!!');
        socket.destroy();
        resolve();
      } else if (data.toString().includes('type="error"') && data.toString().includes('id="reg_1"')) {
        console.log('Fail in register.');
        socket.destroy();
        resolve();
      }
    });

    socket.on('end', resolve);
    socket.connect(PORT, HOST, () => {
      socket.write(`<stream:stream to="'${HOST}'" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams" version="1.0">`);
    });
  });
};


const main = async () => {
  
  run = true;
  while (run) {
    const mainMenuChoice = mainMenu();
    
    switch (mainMenuChoice) {
      case '1':
        const userInfo = getUserInfo();
        const xmpp = client({
          service: "xmpp://alumchat.xyz",
          domain: "alumchat.xyz",
          username: userInfo.username,
          password: userInfo.password,
        });
  
        await login(xmpp);
        break;
  
        case '2':
          const {username, password} = getUserInfo();
          await register(username, password)
          break;  
  
      case '3':
        console.log('Goodbye! Leaving XMPP chat...\n');
        run = false;
        return;
  
      default:
        console.log('Invalid option. Try again.\n');
    }
  }
}

main()