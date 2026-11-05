// Test app for flutter/flutter#194283.
//
// Shows one or more 3840x1980 backgrounds full screen with Image.memory and
// BoxFit.cover, the way the reported app does, and repaints a small panel once
// a second. Query parameters:
//   source=generate (default)  draw the backgrounds and encode them as PNG with
//                              Picture.toImage + toByteData, like the original
//                              repro
//   source=asset               load a pre-made 3840x1980 PNG instead (no
//                              Picture.toImage)
//   quality=none|low|medium|high  Image.filterQuality (default medium)
//   layers=1..6                number of stacked full-screen images (default 1)
// web/flutter_bootstrap.js handles logging, noMipmaps, shrinkToImage and the
// auto-runner.
import 'dart:async';
import 'dart:js_interop';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

const int _width = 3840;
const int _height = 1980;
const int _maxLayers = 6;

final Map<String, String> _params = Uri.base.queryParameters;

@JS('__probeStage')
external JSFunction? get _probeStage;

void _stage(String stage) => _probeStage?.callAsFunction(null, stage.toJS);

void main() => runApp(const ProbeApp());

class ProbeApp extends StatelessWidget {
  const ProbeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(debugShowCheckedModeBanner: false, home: ProbePage());
  }
}

class ProbePage extends StatefulWidget {
  const ProbePage({super.key});

  @override
  State<ProbePage> createState() => _ProbePageState();
}

class _ProbePageState extends State<ProbePage> {
  final FilterQuality _quality = FilterQuality.values.firstWhere(
    (q) => q.name == _params['quality'],
    orElse: () => FilterQuality.medium,
  );
  final int _layers = (int.tryParse(_params['layers'] ?? '') ?? 1).clamp(1, _maxLayers);
  final bool _useAsset = _params['source'] == 'asset';
  final List<Uint8List> _images = <Uint8List>[];
  int _seconds = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _prepare();
    // Like the original repro, repaint once a second.
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => setState(() => _seconds++));
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _prepare() async {
    for (var i = 0; i < _layers; i++) {
      _stage('preparing background ${i + 1}/$_layers');
      final Uint8List bytes;
      if (_useAsset) {
        final ByteData data = await rootBundle.load('assets/background.png');
        // A separate copy per layer, so each one is decoded and uploaded on its own.
        bytes = Uint8List.fromList(data.buffer.asUint8List());
      } else {
        bytes = await _generatePng(i);
      }
      if (!mounted) {
        return;
      }
      _images.add(bytes);
    }
    _stage('backgrounds ready, drawing background 1');
    setState(() {});
    WidgetsBinding.instance.addPostFrameCallback((_) => _stage('background 1 drawn'));
  }

  @override
  Widget build(BuildContext context) {
    final bool ready = _images.length == _layers;
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: <Widget>[
          if (ready)
            for (final Uint8List bytes in _images)
              Image.memory(bytes, fit: BoxFit.cover, filterQuality: _quality, gaplessPlayback: true)
          else
            Center(
              child: Text(
                'Preparing backgrounds ${_images.length}/$_layers…',
                style: const TextStyle(color: Colors.white, fontSize: 24),
              ),
            ),
          Positioned(
            left: 16,
            bottom: 16,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Text(
                  'source: ${_useAsset ? 'asset' : 'generate'} · quality: ${_quality.name} · '
                  'layers: $_layers · ${_seconds}s',
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Draws a gradient background with a grid and a large label, and encodes it
/// as PNG, so it is later decoded like an image asset.
Future<Uint8List> _generatePng(int index) async {
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);
  const size = Size(_width * 1.0, _height * 1.0);
  final double hue = 360.0 * index / _maxLayers;
  canvas.drawRect(
    Offset.zero & size,
    Paint()
      ..shader = ui.Gradient.linear(Offset.zero, size.bottomRight(Offset.zero), <Color>[
        HSVColor.fromAHSV(1, hue, 0.6, 0.9).toColor(),
        HSVColor.fromAHSV(1, (hue + 60) % 360, 0.8, 0.4).toColor(),
      ]),
  );
  final grid = Paint()
    ..color = Colors.white24
    ..strokeWidth = 2;
  for (var x = 0.0; x < size.width; x += 48) {
    canvas.drawLine(Offset(x, 0), Offset(x, size.height), grid);
  }
  for (var y = 0.0; y < size.height; y += 48) {
    canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
  }
  final label = TextPainter(
    text: TextSpan(
      text: 'Background ${index + 1}',
      style: const TextStyle(color: Colors.white, fontSize: 320),
    ),
    textDirection: TextDirection.ltr,
  )..layout();
  label.paint(canvas, size.center(Offset.zero) - label.size.center(Offset.zero));
  label.dispose();

  final ui.Picture picture = recorder.endRecording();
  final ui.Image image = await picture.toImage(_width, _height);
  picture.dispose();
  final ByteData? png = await image.toByteData(format: ui.ImageByteFormat.png);
  image.dispose();
  return png!.buffer.asUint8List();
}
