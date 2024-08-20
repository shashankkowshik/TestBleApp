import { StyleSheet, Dimensions } from 'react-native';

const windowHeight = Dimensions.get('window').height;
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: windowHeight,
    paddingHorizontal: 10,
  },
  scrollContainer: {
    padding: 16,
  },
  title: {
    fontSize: 30,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 40,
  },
  subtitle: {
    fontSize: 24,
    marginBottom: 10,
    marginTop: 20,
  },
  scanButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  scanButtonText: {
    color: 'white',
    textAlign: 'center',
  },
  noDevicesText: {
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  deviceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  deviceItem: {
    marginBottom: 10,
  },
  deviceName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  deviceInfo: {
    fontSize: 14,
  },
  deviceButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 5,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  pingButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  pingButtonText: {
    color: 'white',
    textAlign: 'center',
  },
  shutdownButton: {
    backgroundColor: '#F44336',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  shutdownButtonText: {
    color: 'white',
    textAlign: 'center',
  },
  batteryButton: {
    backgroundColor: '#FFC107',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  batteryButtonText: {
    color: 'white',
    textAlign: 'center',
  },
  statsButton: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#007bff',
    borderRadius: 5,
  },
  statsButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  onButton: {
    backgroundColor: '#70B3F6',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  onButtonText: {
    color: 'white',
    textAlign: 'center',
  },
  offButton: {
    backgroundColor: '#F44336',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  offButtonText: {
    color: 'white',
    textAlign: 'center',
  },
  connectAllButton: {
    backgroundColor: '#70B3F6',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  connectAllButtonText: {
    color: 'white',
    textAlign: 'center',
  },
});

//start pilot | Sequeence Number | Command Code | Compliment | Data Size | Data | CRCc16|  END Pilot
//24 01 05 FA 00 53 79 23
//24 01 09 F6 00 96 7A 23