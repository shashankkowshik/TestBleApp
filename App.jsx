import React, { useState, useEffect } from 'react';
import {
  Text,
  Alert,
  View,
  FlatList,
  Platform,
  StatusBar,
  SafeAreaView,
  NativeModules,
  useColorScheme,
  TouchableOpacity,
  NativeEventEmitter,
  PermissionsAndroid,
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import PushNotification from 'react-native-push-notification';
import { styles } from './src/styles/styles';
import { DeviceList } from './src/DeviceList';
import { Colors } from 'react-native/Libraries/NewAppScreen';

const BleManagerModule = NativeModules.BleManager;
const BleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const serviceUUID = '49535343-fe7d-4ae5-8fa9-9fafd205e455';
const writeCharacteristicUUID = '49535343-8841-43f4-a8d4-ecbe34729bb3';
const notifyCharacteristicUUID = '49535343-1e4d-4bd9-ba61-23c647249616';

PushNotification.configure({
  onRegister: function (token) {
    console.log('TOKEN:', token);
  },
  onNotification: function (notification) {
    console.log('NOTIFICATION:', notification);
  },
  onAction: function (notification) {
    console.log('ACTION:', notification.action);
    console.log('NOTIFICATION:', notification);
  },
  popInitialNotification: true,
  requestPermissions: Platform.OS === 'ios',
});

PushNotification.createChannel(
  {
    channelId: 'default-channel-id',
    channelName: 'Default channel',
    channelDescription: 'A default channel',
    soundName: 'default',
    importance: 4,
    vibrate: true,
  },
  (created) => console.log(`createChannel returned '${created}'`)
);

const App = () => {
  const peripherals = new Map();
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [batteryLevels, setBatteryLevels] = useState({});

  const handleLocationPermission = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 23) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Location permission granted');
        } else {
          console.log('Location permission denied');
        }
      } catch (error) {
        console.log('Error requesting location permission:', error);
      }
    }
  };

  const handleGetConnectedDevices = async () => {
    try {
      const results = await BleManager.getConnectedPeripherals([]);
      const devices = results.filter(device => device.name && device.name.startsWith('LMNP-'));
      devices.forEach(device => peripherals.set(device.id, { ...device, connected: true }));
      setConnectedDevices(devices);
    } catch (error) {
      console.error('Error getting connected devices:', error);
    }
  };

  const discoverServicesAndCharacteristics = async (peripheralId) => {
    try {
      const peripheralInfo = await BleManager.retrieveServices(peripheralId);
      console.log('Peripheral Info:', peripheralInfo);
      await BleManager.startNotification(peripheralId, serviceUUID, notifyCharacteristicUUID);
      console.log(`Notification started for ${peripheralId}`);
    } catch (error) {
      console.error('Error discovering services and characteristics:', error);
    }
  };

  useEffect(() => {
    handleLocationPermission();

    BleManager.enableBluetooth().then(() => {
      console.log('Bluetooth is turned on!');
    });

    BleManager.start({ showAlert: false }).then(() => {
      console.log('BleManager initialized');
      handleGetConnectedDevices();
    });

    const handleDiscoverPeripheral = (peripheral) => {
      if (peripheral.name && peripheral.name.startsWith('LMNP-')) {
        peripherals.set(peripheral.id, peripheral);
        setDiscoveredDevices(Array.from(peripherals.values()).filter(device => device.name && device.name.startsWith('LMNP-')));
      }
    };

    const stopDiscoverListener = BleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      handleDiscoverPeripheral,
    );

    const stopConnectListener = BleManagerEmitter.addListener(
      'BleManagerConnectPeripheral',
      peripheral => {
        console.log('BleManagerConnectPeripheral:', peripheral);
        peripherals.set(peripheral.id, { ...peripheral, connected: true });
        setConnectedDevices(Array.from(peripherals.values()).filter(device => device.name && device.name.startsWith('LMNP-')));
      },
    );

    const stopDisconnectListener = BleManagerEmitter.addListener(
      'BleManagerDisconnectPeripheral',
      peripheral => {
        console.log('BleManagerDisconnectPeripheral:', peripheral);
        peripherals.set(peripheral.id, { ...peripheral, connected: false });
        setConnectedDevices(Array.from(peripherals.values()).filter(device => device.name && device.name.startsWith('LMNP-')));
      },
    );

    const stopScanListener = BleManagerEmitter.addListener(
      'BleManagerStopScan',
      () => {
        setIsScanning(false);
        console.log('Scan stopped');
      },
    );

    const handleUpdateValueForCharacteristic = ({ value, peripheral, characteristic, service }) => {
      if (characteristic === notifyCharacteristicUUID) {
        const response = value;
        const device = peripherals.get(peripheral);
        if (device) {
          const responseString = response.map(byte => byte.toString(16).padStart(2, '0')).join(' ');
          console.log(`Response from ${device.name}: ${responseString}`);
          
          // Check if the third byte (index 2) is 0x05 (PACK response)
          if (response[2] === 0x05) {
            if (response.length >= 8) {
              const batteryHex = response[4];
              const batteryDecimal = parseInt(batteryHex.toString(16), 16);
              setBatteryLevels(prevState => ({
                ...prevState,
                [peripheral]: [...(prevState[peripheral] || []), batteryDecimal],
              }));

              console.log(`The Battery level of the device is: ${batteryDecimal}`);
              console.log(`The Battery remaining in Hex is: ${response[4].toString(16).padStart(2, '0')}`); // Print the 5th byte
            } else {
              console.log('Response length is less than expected');
            }
          } else {
            console.log('NACK response received, ignoring...');
          }
        }
      }
    };

    const updateValueListener = BleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      handleUpdateValueForCharacteristic
    );

    return () => {
      stopDiscoverListener.remove();
      stopConnectListener.remove();
      stopDisconnectListener.remove();
      stopScanListener.remove();
      updateValueListener.remove(); // Ensure to clean up the listener
    };
  }, []);

  const scan = () => {
    if (!isScanning) {
      BleManager.scan([], 5, true)
        .then(() => {
          console.log('Scanning...');
          setIsScanning(true);
        })
        .catch(error => {
          console.error('Error during scan:', error);
        });
    }
  };

  const connect = async (peripheral) => {
    try {
      console.log(`Connecting to ${peripheral.name} (${peripheral.id})`);
      await BleManager.connect(peripheral.id);
      peripherals.set(peripheral.id, { ...peripheral, connected: true });
      setConnectedDevices(Array.from(peripherals.values()).filter(device => device.name && device.name.startsWith('LMNP-')));
      setDiscoveredDevices(Array.from(peripherals.values()).filter(device => device.name && device.name.startsWith('LMNP-')));
      console.log('BLE device connected successfully');

      await discoverServicesAndCharacteristics(peripheral.id);
    } catch (error) {
      console.error('Failed to connect:', error);
      Alert.alert('Error', `Failed to connect to ${peripheral.name}. Retrying...`);
      setTimeout(() => connect(peripheral), 3000); // Retry after 3 seconds
    }
  };

  const disconnect = async (peripheral) => {
    try {
      console.log(`Disconnecting from ${peripheral.name} (${peripheral.id})`);
      await BleManager.disconnect(peripheral.id);
      peripherals.set(peripheral.id, { ...peripheral, connected: false });
      setConnectedDevices(Array.from(peripherals.values()).filter(device => device.name && device.name.startsWith('LMNP-')));
      setDiscoveredDevices(Array.from(peripherals.values()).filter(device => device.name && device.name.startsWith('LMNP-')));
      Alert.alert(`Disconnected from ${peripheral.name}`);
    } catch (error) {
      console.error('Failed to disconnect:', error);
      Alert.alert('Error', `Failed to disconnect from ${peripheral.name}`);
    }
  };

  const connectAllDevices = async () => {
    const devicesToConnect = discoveredDevices.filter(device => device.name.startsWith('LMNP-'));
    await Promise.all(devicesToConnect.map(device => connect(device)));
  };

  const isDarkMode = useColorScheme() === 'dark';
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const hexStringToByteArray = (hexString) => {
    if (hexString.length % 2 !== 0) {
      throw new Error('Invalid hex string');
    }
    const byteArray = [];
    for (let i = 0; i < hexString.length; i += 2) {
      byteArray.push(parseInt(hexString.substr(i, 2), 16));
    }
    return byteArray;
  };

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const sendBatteryCommandWithDelay = async (device, delayTime, iterations) => {
    const batteryCommand = '240105FA00537923';
    for (let i = 0; i < iterations; i++) {
      await executeCommandOnDevices(batteryCommand, 'check battery');
      await delay(delayTime);
    }
    console.log(`The 5 battery readings for ${device.name} are ${batteryLevels[device.id] || []}`);
  };

  const executeCommandOnDevices = async (command, commandDescription) => {
    const devicesToCommand = connectedDevices.filter(device =>
      device.name.startsWith('LMNP-')
    );

    if (devicesToCommand.length === 0) {
      Alert.alert(`No devices found to ${commandDescription}`);
      return;
    }

    const commandBuffer = hexStringToByteArray(command);
    await Promise.all(devicesToCommand.map(async (device) => {
      try {
        console.log(`Attempting to ${commandDescription} ${device.name} with ID ${device.id}`);
        const peripheralInfo = await BleManager.retrieveServices(device.id);
        console.log('Peripheral Info:', peripheralInfo);

        await BleManager.write(device.id, serviceUUID, writeCharacteristicUUID, commandBuffer);
        console.log(`${commandDescription} command sent to ${device.name}`);
      } catch (error) {
        console.error(`Failed to ${commandDescription} ${device.name}:`, error);
        Alert.alert(`Failed to ${commandDescription} ${device.name}: ${error.message}`);
      }
    }));
  };

  const handlePing = async () => {
    const pingCommand = '240109F600967A23';
    await executeCommandOnDevices(pingCommand, 'ping');
  };

  const handleOn = async () => {
    const onCommand = '240106F900A38923';
    await executeCommandOnDevices(onCommand, 'turn ON');
  };

  const handleOff1 = async () => {
    const offCommand = '240107F800F3D923';
    await executeCommandOnDevices(offCommand, 'turn OFF');
  };

  const handleShutdown = async () => {
    const shutdownCommand = '240110EF004C2D23';
    await executeCommandOnDevices(shutdownCommand, 'shut down');
  };

  const handleBattery = async () => {
    const devicesToCommand = connectedDevices.filter(device =>
      device.name.startsWith('LMNP-')
    );

    if (devicesToCommand.length === 0) {
      Alert.alert('No devices found to check battery');
      return;
    }

    // Clear previous readings
    setBatteryLevels({});

    for (const device of devicesToCommand) {
      await sendBatteryCommandWithDelay(device, 500, 5);
    }
  };

  const handleStats = async () => {
    const statsCommand = '240118E900172D 23';
    await executeCommandOnDevices(statsCommand, 'retrieve stats');
    console.log('Stats command sent');
  };

  return (
    <SafeAreaView style={[backgroundStyle, styles.container]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <View style={{ paddingHorizontal: 20 }}>
        <Text
          style={[
            styles.title,
            { color: isDarkMode ? Colors.white : Colors.black },
          ]}
        >
          LiteMed
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <TouchableOpacity
            onPress={handlePing}
            activeOpacity={0.5}
            style={styles.pingButton}
          >
            <Text style={styles.pingButtonText}>Ping</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShutdown}
            activeOpacity={0.5}
            style={styles.shutdownButton}
          >
            <Text style={styles.shutdownButtonText}>Shutdown</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleBattery}
            activeOpacity={0.5}
            style={styles.batteryButton}
          >
            <Text style={styles.batteryButtonText}>Battery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleOn}
            activeOpacity={0.5}
            style={styles.onButton}
          >
            <Text style={styles.onButtonText}>ON</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleOff1}
            activeOpacity={0.5}
            style={styles.offButton}
          >
            <Text style={styles.offButtonText}>OFF</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={handleStats}
          activeOpacity={0.5}
          style={styles.statsButton}
        >
          <Text style={styles.statsButtonText}>Stats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={scan}
          activeOpacity={0.5}
          style={styles.scanButton}
        >
          <Text style={styles.scanButtonText}>
            {isScanning ? 'Scanning...' : 'Scan for Curapods'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={connectAllDevices}
          activeOpacity={0.5}
          style={styles.connectAllButton}
        >
          <Text style={styles.connectAllButtonText}>Connect all</Text>
          
        </TouchableOpacity>
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 18 }}>
            The battery level of the devices is:
          </Text>
          {Object.entries(batteryLevels).map(([deviceId, levels]) => (
            <View key={deviceId} style={{ fontSize: 18, borderColor: 'gray', borderWidth: 1, padding: 10 }}>
              <Text>{deviceId}:</Text>
              {levels.map((level, index) => (
                <Text key={index}>{level}</Text>
              ))}
            </View>
          ))}
        </View>
        <Text
          style={[
            styles.subtitle,
            { color: isDarkMode ? Colors.white : Colors.black },
          ]}
        >
          Saved Devices:
        </Text>
        {discoveredDevices.length > 0 ? (
          <FlatList
            data={discoveredDevices}
            renderItem={({ item }) => (
              <DeviceList
                peripheral={item}
                connect={connect}
                disconnect={disconnect}
              />
            )}
            keyExtractor={item => item.id}
          />
        ) : (
          <Text style={styles.noDevicesText}>No Bluetooth devices found</Text>
        )}

        <Text
          style={[
            styles.subtitle,
            { color: isDarkMode ? Colors.white : Colors.black },
          ]}
        >
          Connected Devices:
        </Text>
        {connectedDevices.length > 0 ? (
          <FlatList
            data={connectedDevices}
            renderItem={({ item }) => (
              <DeviceList
                peripheral={item}
                connect={connect}
                disconnect={disconnect}
              />
            )}
            keyExtractor={item => item.id}
          />
        ) : (
          <Text style={styles.noDevicesText}>No connected devices</Text>
        )}
       
      </View>
    </SafeAreaView>
  );
};

export default App;