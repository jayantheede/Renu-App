import 'package:flutter/material.dart';

void main() {
  runApp(const ReNuBiomeApp());
}

class ReNuBiomeApp extends StatelessWidget {
  const ReNuBiomeApp({super.key});

  static const Color primaryTeal = Color(0xFF0C6054);
  static const Color accentOrange = Color(0xFFF07E42);
  static const Color neutralLight = Color(0xFFF4F8F7);
  static const Color cardDark = Color(0xFF1E293B);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ReNu-Biome Grower Portal',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        primaryColor: primaryTeal,
        scaffoldBackgroundColor: neutralLight,
        colorScheme: ColorScheme.fromSeed(
          seedColor: primaryTeal,
          primary: primaryTeal,
          secondary: accentOrange,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: primaryTeal,
          foregroundColor: Colors.white,
          elevation: 0,
        ),
      ),
      home: const LoginScreen(),
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;

  void _handleLogin() async {
    setState(() => _isLoading = true);
    await Future.delayed(const Duration(milliseconds: 800));
    setState(() => _isLoading = false);

    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const DashboardScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(
                  Icons.eco,
                  size: 64,
                  color: ReNuBiomeApp.primaryTeal,
                ),
                const SizedBox(height: 12),
                const Text(
                  'ReNu-Biome',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: ReNuBiomeApp.primaryTeal,
                    letterSpacing: 0.5,
                  ),
                ),
                const Text(
                  'Grower & Commercial Portal',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.black54,
                  ),
                ),
                const SizedBox(height: 36),
                Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      children: [
                        TextField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          decoration: const InputDecoration(
                            labelText: 'Work Email',
                            prefixIcon: Icon(Icons.email_outlined),
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          decoration: InputDecoration(
                            labelText: 'Password',
                            prefixIcon: const Icon(Icons.lock_outline),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword ? Icons.visibility : Icons.visibility_off,
                              ),
                              onPressed: () {
                                setState(() => _obscurePassword = !_obscurePassword);
                              },
                            ),
                            border: const OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 24),
                        SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: ElevatedButton(
                            onPressed: _isLoading ? null : _handleLogin,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: ReNuBiomeApp.primaryTeal,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            child: _isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Text(
                                    'Sign In',
                                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Need assistance? Contact support@renu-biome.com',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: Colors.black45),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final screens = [
      const TankTelemetryView(),
      const OrdersDeliveryView(),
      const AccountProfileView(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('ReNu-Biome Portal'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (_) => const LoginScreen()),
              );
            },
          ),
        ],
      ),
      body: screens[_selectedIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (idx) => setState(() => _selectedIndex = idx),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.propane_tank_outlined),
            selectedIcon: Icon(Icons.propane_tank),
            label: 'Telemetry',
          ),
          NavigationDestination(
            icon: Icon(Icons.local_shipping_outlined),
            selectedIcon: Icon(Icons.local_shipping),
            label: 'Deliveries',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

class TankTelemetryView extends StatelessWidget {
  const TankTelemetryView({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        Card(
          color: const Color(0xFF0C6054),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Tank 1 - North Orchard',
                      style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    Chip(
                      label: Text('ONLINE', style: TextStyle(color: Colors.white, fontSize: 10)),
                      backgroundColor: Colors.green,
                      padding: EdgeInsets.zero,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Current Level', style: TextStyle(color: Colors.white70)),
                    Text('76.4%', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: const LinearProgressIndicator(
                    value: 0.764,
                    minHeight: 12,
                    backgroundColor: Colors.white24,
                    valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFF07E42)),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Otodata Telemetry: Updated 4 minutes ago',
                  style: TextStyle(color: Colors.white60, fontSize: 11),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: const ListTile(
            leading: CircleAvatar(
              backgroundColor: Color(0xFFE0F2F1),
              child: Icon(Icons.water_drop, color: Color(0xFF0C6054)),
            ),
            title: Text('Estimated Days Remaining'),
            trailing: Text(
              '14 Days',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0C6054)),
            ),
          ),
        ),
      ],
    );
  }
}

class OrdersDeliveryView extends StatelessWidget {
  const OrdersDeliveryView({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: const ListTile(
            leading: CircleAvatar(
              backgroundColor: Color(0xFFFFEDE2),
              child: Icon(Icons.route, color: Color(0xFFF07E42)),
            ),
            title: Text('Order #RN-10492'),
            subtitle: Text('OptimoRoute Status: In Transit'),
            trailing: Text('ETA 14:30', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ),
      ],
    );
  }
}

class AccountProfileView extends StatelessWidget {
  const AccountProfileView({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: const [
        ListTile(
          leading: Icon(Icons.business),
          title: Text('Organization'),
          subtitle: Text('ReNu-Biome Commercial Grower'),
        ),
        Divider(),
        ListTile(
          leading: Icon(Icons.mail_outline),
          title: Text('Support Inquiries'),
          subtitle: Text('support@renu-biome.com'),
        ),
      ],
    );
  }
}

