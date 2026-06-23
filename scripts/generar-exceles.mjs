import * as XLSX from 'xlsx'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

mkdirSync(join(root, 'Clientes'), { recursive: true })
mkdirSync(join(root, 'Productos'), { recursive: true })

const clientesData = [
  { cuit: '30-12345678-9', razonSocial: 'GRUPO FALPAT SRL', direccion: 'Av. Corrientes 1234, CABA', telefono: '011-4567-8901' },
  { cuit: '30-23456789-0', razonSocial: 'MATERIALES DEL SUR SA', direccion: 'Av. Rivadavia 5678, CABA', telefono: '011-5678-9012' },
  { cuit: '27-34567890-1', razonSocial: 'CONSTRUCCIONES NORTE SRL', direccion: 'Av. Cabildo 4321, CABA', telefono: '011-6789-0123' },
  { cuit: '30-45678901-2', razonSocial: 'HIERROS ARGENTINA SA', direccion: 'Av. Juan B. Justo 7890, CABA', telefono: '011-7890-1234' },
  { cuit: '27-56789012-3', razonSocial: 'PINTURERÍA EL COLOR SRL', direccion: 'Av. San Martín 3456, CABA', telefono: '011-8901-2345' },
  { cuit: '20-67890123-4', razonSocial: 'ELECTRO TOTAL SH', direccion: 'Av. Alem 123, CABA', telefono: '011-9012-3456' },
  { cuit: '30-78901234-5', razonSocial: 'SANITARIOS GONZÁLEZ SA', direccion: 'Av. Belgrano 8901, CABA', telefono: '011-0123-4567' },
  { cuit: '27-89012345-6', razonSocial: 'ARENAS Y PIEDRAS DEL PLATA SRL', direccion: 'Ruta 8 Km 36, Pilar', telefono: '0230-456-7890' },
  { cuit: '30-90123456-7', razonSocial: 'MADERERA BOREAL SA', direccion: 'Av. Libertador 5678, Vicente López', telefono: '011-4790-1234' },
  { cuit: '20-01234567-8', razonSocial: 'PISOS Y REVESTIMIENTOS SH', direccion: 'Av. Santa Fe 2345, CABA', telefono: '011-5678-4321' },
  { cuit: '30-11223344-5', razonSocial: 'TECHOS DEL NORTE SA', direccion: 'Av. de Mayo 6789, CABA', telefono: '011-2345-6789' },
  { cuit: '27-22334455-6', razonSocial: 'AGLOMERADOS LOMAS SRL', direccion: 'Av. Hipólito Yrigoyen 4567, Lomas de Zamora', telefono: '011-4567-1234' },
  { cuit: '30-33445566-7', razonSocial: 'CEMENTO CRUZ SA', direccion: 'Av. Mitre 7890, San Justo', telefono: '011-6789-5678' },
  { cuit: '20-44556677-8', razonSocial: 'HERRERÍA ARTÍSTICA SH', direccion: 'Av. Directorio 1234, CABA', telefono: '011-8901-6789' },
  { cuit: '27-55667788-9', razonSocial: 'ELECTRICIDAD INDUSTRIAL SRL', direccion: 'Av. La Plata 5678, CABA', telefono: '011-9012-7890' },
]

const wbClientes = XLSX.utils.book_new()
const wsClientes = XLSX.utils.json_to_sheet(clientesData, { header: ['cuit', 'razonSocial', 'direccion', 'telefono'] })
wsClientes['!cols'] = [{ wch: 18 }, { wch: 40 }, { wch: 45 }, { wch: 20 }]
XLSX.utils.book_append_sheet(wbClientes, wsClientes, 'Clientes')
XLSX.writeFile(wbClientes, join(root, 'Clientes', 'ejemplo_clientes.xlsx'))
console.log('✅ Clientes/ejemplo_clientes.xlsx')

const wbCliTemplate = XLSX.utils.book_new()
const wsCliTemplate = XLSX.utils.json_to_sheet(
  [],
  { header: ['cuit', 'razonSocial', 'direccion', 'telefono'] }
)
wsCliTemplate['!cols'] = [{ wch: 18 }, { wch: 40 }, { wch: 45 }, { wch: 20 }]
XLSX.utils.book_append_sheet(wbCliTemplate, wsCliTemplate, 'Clientes')
XLSX.writeFile(wbCliTemplate, join(root, 'Clientes', 'template_clientes.xlsx'))
console.log('✅ Clientes/template_clientes.xlsx')

const productosData = [
  { nombre: 'Cemento Portland CPC 50kg', tipo: 'Cemento', medida: 'Bolsa', valorUnitario: 4850, stock: 200 },
  { nombre: 'Varilla de hierro diámetro 8mm', tipo: 'Hierros', medida: 'Kg', valorUnitario: 890, stock: 500 },
  { nombre: 'Arena lavada fina', tipo: 'Arena/Piedra', medida: 'm3', valorUnitario: 12500, stock: 30 },
  { nombre: 'Piedra partida 6-20', tipo: 'Arena/Piedra', medida: 'm3', valorUnitario: 14200, stock: 25 },
  { nombre: 'Ladrillo hueco 18x18x33', tipo: 'Aglomerados', medida: 'Unidad', valorUnitario: 180, stock: 1500 },
  { nombre: 'Cable eléctrico 2.5mm x 100m', tipo: 'Electricidad', medida: 'Unidad', valorUnitario: 15200, stock: 45 },
  { nombre: 'Pintura látex interior 20L', tipo: 'Pinturería', medida: 'Litro', valorUnitario: 3200, stock: 80 },
  { nombre: 'Inodoro largo blanco', tipo: 'Sanitarios', medida: 'Unidad', valorUnitario: 78500, stock: 15 },
  { nombre: 'Mochila de inodoro', tipo: 'Sanitarios', medida: 'Unidad', valorUnitario: 42000, stock: 20 },
  { nombre: 'Caño de PVC 110mm x 3m', tipo: 'Sanitarios', medida: 'Unidad', valorUnitario: 5800, stock: 100 },
  { nombre: 'Chapa acanalada galvanizada 3m', tipo: 'Techos', medida: 'Unidad', valorUnitario: 9200, stock: 60 },
  { nombre: 'Madera tirante 2x4 x 3m', tipo: 'Madera', medida: 'Unidad', valorUnitario: 2100, stock: 120 },
  { nombre: 'Piso cerámico rectificado 60x60', tipo: 'Pisos', medida: 'm2', valorUnitario: 9800, stock: 200 },
  { nombre: 'Hierro ángulo 25x25x3mm x 6m', tipo: 'Herrería', medida: 'Unidad', valorUnitario: 11500, stock: 35 },
  { nombre: 'Aglomerado melamínico 18mm 1.84x2.80', tipo: 'Aglomerados', medida: 'Unidad', valorUnitario: 18500, stock: 40 },
  { nombre: 'Cemento de contacto x 1L', tipo: 'Pinturería', medida: 'Litro', valorUnitario: 4500, stock: 55 },
  { nombre: 'Canaleta PVC 20x20 x 2m', tipo: 'Electricidad', medida: 'Unidad', valorUnitario: 1200, stock: 300 },
  { nombre: 'Teja colonial mixta', tipo: 'Techos', medida: 'Unidad', valorUnitario: 650, stock: 500 },
  { nombre: 'Malla sima 4.20x2.10 15x15', tipo: 'Hierros', medida: 'Unidad', valorUnitario: 28000, stock: 10 },
  { nombre: 'Portland cemento albañilería 25kg', tipo: 'Cemento', medida: 'Bolsa', valorUnitario: 2600, stock: 180 },
]

const wbProductos = XLSX.utils.book_new()
const wsProductos = XLSX.utils.json_to_sheet(productosData, { header: ['nombre', 'tipo', 'medida', 'valorUnitario', 'stock'] })
wsProductos['!cols'] = [{ wch: 42 }, { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 8 }]
XLSX.utils.book_append_sheet(wbProductos, wsProductos, 'Productos')
XLSX.writeFile(wbProductos, join(root, 'Productos', 'ejemplo_productos.xlsx'))
console.log('✅ Productos/ejemplo_productos.xlsx')

const wbProdTemplate = XLSX.utils.book_new()
const wsProdTemplate = XLSX.utils.json_to_sheet(
  [],
  { header: ['nombre', 'tipo', 'medida', 'valorUnitario', 'stock'] }
)
wsProdTemplate['!cols'] = [{ wch: 42 }, { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 8 }]
XLSX.utils.book_append_sheet(wbProdTemplate, wsProdTemplate, 'Productos')
XLSX.writeFile(wbProdTemplate, join(root, 'Productos', 'template_productos.xlsx'))
console.log('✅ Productos/template_productos.xlsx')
