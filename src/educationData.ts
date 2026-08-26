import type { Course, Badge, Objection, RoleplayNode } from './types';

// ============================================================
// Badges
// ============================================================

export const BADGES: Badge[] = [
  { id: 'bdg1', name: 'Aprendiz', description: 'Completa tu primer quiz', icon: 'Sparkles', threshold: 50 },
  { id: 'bdg2', name: 'Competente', description: 'Alcanza 70% en un quiz', icon: 'Award', threshold: 70 },
  { id: 'bdg3', name: 'Experto', description: 'Alcanza 85% en un quiz', icon: 'Medal', threshold: 85 },
  { id: 'bdg4', name: 'Maestro de Ventas', description: 'Alcanza 100% en un quiz', icon: 'Trophy', threshold: 100 },
];

// ============================================================
// Courses
// ============================================================

export const COURSES: Course[] = [
  {
    id: 'crs1',
    title: 'Fundamentos de Venta a Crédito',
    category: 'ventas',
    level: 'inicial',
    durationMin: 35,
    description:
      'Aprende el ciclo completo de una solicitud a crédito: desde el primer contacto hasta el cierre y la firma del contrato.',
    lessons: [
      {
        id: 'l1',
        title: 'El ciclo de venta a crédito',
        body: 'La venta a crédito difiere de la venta al contado porque el cliente asume un compromiso de pago prolongado. El ciclo incluye: prospección, calificación, presentación, cálculo del plan, firma, entrega y seguimiento de cobranza.',
        keyTakeaway: 'El crédito convierte una transacción en una relación de largo plazo.',
      },
      {
        id: 'l2',
        title: 'Calificación del cliente',
        body: 'Antes de ofertar, valida tres pilares: capacidad de pago (ingresos estables), voluntad de pago (historial) y garantía moral (referencias). Una inicial adecuada reduce el riesgo de mora.',
        keyTakeaway: 'Capacidad + voluntad + inicial = solicitud viable.',
      },
      {
        id: 'l3',
        title: 'Presentación de la propuesta',
        body: 'Presenta el plan de pago en términos sencillos: cuota, frecuencia y total a pagar. Evita tecnicismos; usa analogías del día a día ("menos de una cafetera diaria").',
        keyTakeaway: 'Si el cliente entiende la cuota, la objeción desaparece.',
      },
    ],
    quiz: {
      id: 'q1',
      questions: [
        {
          id: 'qq1',
          prompt: '¿Cuál es el primer paso del ciclo de venta a crédito?',
          options: ['Firma del contrato', 'Prospección', 'Cobranza', 'Entrega'],
          correctIndex: 1,
          explanation: 'Todo comienza con la prospección: identificar clientes potenciales.',
        },
        {
          id: 'qq2',
          prompt: '¿Qué valida la "voluntad de pago"?',
          options: ['Ingresos actuales', 'Historial de pagos previos', 'El monto de la inicial', 'El producto elegido'],
          correctIndex: 1,
          explanation: 'La voluntad de pago se mide con el historial crediticio y referencias.',
        },
        {
          id: 'qq3',
          prompt: '¿Por qué conviene presentar la cuota con analogías cotidianas?',
          options: [
            'Para inflar el precio',
            'Para que el cliente entienda el esfuerzo mensual',
            'Para ocultar el interés',
            'No conviene, es mejor usar tasas',
          ],
          correctIndex: 1,
          explanation: 'Analogías hacen tangible el compromiso de pago.',
        },
        {
          id: 'qq4',
          prompt: 'Una inicial más alta generalmente:',
          options: ['Aumenta el riesgo de mora', 'Reduce el riesgo de mora', 'No afecta el riesgo', 'Elimina el interés'],
          correctIndex: 1,
          explanation: 'Mayor inicial = menor saldo financiado = menor riesgo.',
        },
      ],
    },
  },
  {
    id: 'crs2',
    title: 'Estrategias de Cobranza Preventiva',
    category: 'cobranza',
    level: 'intermedio',
    durationMin: 45,
    description:
      'Técnicas para anticiparte al impago: recordatorios, renegociación y manejo de la mora temprana sin dañar la relación.',
    lessons: [
      {
        id: 'l1',
        title: 'Cobranza preventiva',
        body: 'El 80% de la mora se evita con recordatorios 48h antes del vencimiento. Un mensaje amable reduce el olvido como causa de impago.',
        keyTakeaway: 'Recordar antes de vencer es cobrar dos veces.',
      },
      {
        id: 'l2',
        title: 'Renegociación inteligente',
        body: 'Cuando el cliente entra en dificultad, ofrece opciones: refinanciar saldo, ampliar plazo o reducir cuota temporalmente. Documenta todo en la bitácora.',
        keyTakeaway: 'Renegociar a tiempo rescata la cartera.',
      },
      {
        id: 'l3',
        title: 'Escalamiento',
        body: 'Si tras tres contactos no hay pago, escala a supervisor. Nunca amenaces; documenta y deriva. La presión debe ser institucional, no personal.',
        keyTakeaway: 'Escalona con datos, no con emociones.',
      },
    ],
    quiz: {
      id: 'q2',
      questions: [
        {
          id: 'qq1',
          prompt: '¿Cuándo se debe enviar el recordatorio de pago?',
          options: ['El día del vencimiento', '48h antes del vencimiento', 'Una semana después', 'Nunca, es invasivo'],
          correctIndex: 1,
          explanation: '48h antes evita el impago por olvido.',
        },
        {
          id: 'qq2',
          prompt: 'Ante una dificultad del cliente, lo correcto es:',
          options: ['Bloquear al cliente', 'Ofrecer renegociación documentada', 'Ignorar hasta que pague', 'Subir el interés'],
          correctIndex: 1,
          explanation: 'Renegociar a tiempo rescata la cartera.',
        },
        {
          id: 'qq3',
          prompt: 'Tras cuántos contactos fallidos se escala a supervisor?',
          options: ['1', '3', '10', 'Nunca'],
          correctIndex: 1,
          explanation: 'Tres intentos fallidos justifican el escalamiento.',
        },
        {
          id: 'qq4',
          prompt: 'La presión de cobranza debe ser:',
          options: ['Personal y emocional', 'Institucional y documentada', 'Pública', 'Inexistente'],
          correctIndex: 1,
          explanation: 'La presión institucional protege la relación y la marca.',
        },
      ],
    },
  },
  {
    id: 'crs3',
    title: 'Anatomía del Producto: Electrodomésticos',
    category: 'producto',
    level: 'inicial',
    durationMin: 25,
    description:
      'Conoce las categorías, márgenes y argumentos de venta de los productos estrella del catálogo.',
    lessons: [
      {
        id: 'l1',
        title: 'Línea blanca',
        body: 'Neveras y lavadoras son productos de necesidad y alta rotación. Destaca eficiencia energética y durabilidad como argumentos de valor.',
        keyTakeaway: 'Vende durabilidad y ahorro, no características.',
      },
      {
        id: 'l2',
        title: 'Electrónica',
        body: 'TVs y aires acondicionados son productos aspiracionales. El plan a crédito los hace accesibles; enfatiza "cuota mensual vs. ahorro manual".',
        keyTakeaway: 'El crédito convierte deseo en compra inmediata.',
      },
    ],
    quiz: {
      id: 'q3',
      questions: [
        {
          id: 'qq1',
          prompt: '¿Qué argumento vende mejor una nevera?',
          options: ['Consumo en watts', 'Durabilidad y ahorro energético', 'Color de la puerta', 'El tamaño de la caja'],
          correctIndex: 1,
          explanation: 'Durabilidad y ahorro conectan con necesidad real.',
        },
        {
          id: 'qq2',
          prompt: 'Los productos aspiracionales se venden mejor destacando:',
          options: ['El precio al contado', 'La cuota vs. el ahorro manual', 'La garantía de 90 días', 'El peso del equipo'],
          correctIndex: 1,
          explanation: 'La cuota mensual hace tangible la accesibilidad.',
        },
      ],
    },
  },
  {
    id: 'crs4',
    title: 'Manejo Avanzado de Objeciones',
    category: 'objeciones',
    level: 'avanzado',
    durationMin: 50,
    description:
      'Domina el método R.E.S. para convertir un "no" en un "sí" sin presionar al cliente.',
    lessons: [
      {
        id: 'l1',
        title: 'El método R.E.S.',
        body: 'Relación: empatiza antes de contraargumentar. Educación: aporta información que reencuadra la objeción. Solución: ofrece una opción concreta que resuelve la inquietud.',
        keyTakeaway: 'R.E.S. convierte la resistencia en colaboración.',
      },
      {
        id: 'l2',
        title: 'Objeciones frecuentes',
        body: '"Es muy caro", "Tengo que pensarlo", "Las cuotas son altas". Cada una tiene una raíz: precio, confianza o flujo de caja. Identifica la raíz antes de responder.',
        keyTakeaway: 'Diagnóstico antes que respuesta.',
      },
    ],
    quiz: {
      id: 'q4',
      questions: [
        {
          id: 'qq1',
          prompt: '¿Qué significa la "R" en R.E.S.?',
          options: ['Rechazo', 'Relación', 'Reclamo', 'Retroceso'],
          correctIndex: 1,
          explanation: 'Relación: empatizar primero.',
        },
        {
          id: 'qq2',
          prompt: 'Ante "tengo que pensarlo", primero debes:',
          options: ['Ofrecer descuento', 'Identificar la raíz de la duda', 'Cerrar la venta ya', 'Insistir'],
          correctIndex: 1,
          explanation: 'Identificar la raíz evita responder a la objeción equivocada.',
        },
        {
          id: 'qq3',
          prompt: 'La "S" de R.E.S. implica:',
          options: ['Sumar un descuento', 'Ofrecer una solución concreta', 'Silenciar al cliente', 'Saldar la deuda'],
          correctIndex: 1,
          explanation: 'Solución: una opción concreta, no un descuento automático.',
        },
      ],
    },
  },
  // ============================================================
  // Cursos de operación del CRM.
  // El contenido sale de los documentos del proyecto y, sobre todo,
  // de las reglas que están de verdad programadas: umbrales del
  // score, días de gracia, monto de la mora, tramos de antigüedad.
  // Si alguna de esas reglas cambia en el código, hay que corregir
  // también la lección — si no, el curso enseña algo falso.
  // ============================================================
  {
    id: 'crs5',
    title: 'Cómo se calcula el riesgo de un cliente',
    category: 'ventas',
    level: 'intermedio',
    durationMin: 30,
    description:
      'Qué mira el sistema para dar un puntaje del 0 al 100, por qué a veces prohíbe la venta, y cómo leer la recomendación antes de comprometerte con el cliente.',
    lessons: [
      {
        id: 'l1',
        title: 'Las dos prohibiciones absolutas',
        body: 'Hay dos casos donde el sistema no negocia y pone el puntaje en 0: que el cliente no tenga cédula física, y que lleve menos de 3 meses en su empleo. No importa cuánto gane ni cuánta inicial ofrezca — si falta cualquiera de las dos, la venta está prohibida. No es un capricho del programa: sin cédula no hay a quién reclamarle, y menos de 3 meses de trabajo significa que todavía puede estar en período de prueba.',
        keyTakeaway: 'Sin cédula física o con menos de 3 meses de trabajo, no se vende. Punto.',
      },
      {
        id: 'l2',
        title: 'Los cinco factores que suman',
        body: 'Si pasa las prohibiciones, el puntaje sale de cinco cosas: cuánto gana al mes, cuánto lleva en su trabajo, qué tan pesada le queda la cuota frente a su ingreso, su historial con nosotros, y si tiene la cédula. Cada factor tiene un peso configurable en Configuración → Pesos del motor de scoring. Cambiar esos pesos cambia el puntaje de todos los clientes nuevos, así que no se tocan a la ligera.',
        keyTakeaway: 'El puntaje no es una corazonada: es una fórmula que tú puedes ajustar.',
      },
      {
        id: 'l3',
        title: 'Cuánto gana y cuánto le pesa la cuota',
        body: 'En ingreso, el sistema da la nota máxima desde $400 al mes; $300 ya es sólido, $200 es aceptable y por debajo de $120 el factor cae casi a cero. Pero el ingreso solo no basta: importa qué porcentaje se lleva la cuota. Si la cuota es menos del 10% de lo que gana, es holgado; entre 20% y 30% ya aprieta; por encima del 40% es una cuota que va a terminar en mora.',
        keyTakeaway: 'Una cuota que se come más del 40% del sueldo es una mora esperando ocurrir.',
      },
      {
        id: 'l4',
        title: 'La inicial suma, no restar',
        body: 'En este negocio la mayoría de los clientes no da inicial, así que NO dar inicial no resta ningún punto. Pero si el cliente da algo, aunque sea poco, el sistema le suma puntos de bono. Ese bono se configura aparte de los pesos, en "Bono por inicial".',
        keyTakeaway: 'Sin inicial no se penaliza; con inicial se premia.',
      },
      {
        id: 'l5',
        title: 'Leer la recomendación',
        body: 'El panel de riesgo no solo da un número: da una recomendación (aprobar, revisar, rechazar) y lista las razones concretas que llevaron a ese resultado. Léelas antes de prometerle nada al cliente. Si dice "venta prohibida", el plan de cuotas ni siquiera se genera.',
        keyTakeaway: 'Lee las razones, no solo el número. Ahí está el argumento para el cliente.',
      },
    ],
    quiz: {
      id: 'q5',
      questions: [
        {
          id: 'qq1',
          prompt: 'Un cliente gana $600 al mes pero lleva 2 meses en su trabajo. ¿Qué puntaje le da el sistema?',
          options: ['Alto, porque gana bien', '0 — venta prohibida', 'Medio, hay que revisarlo', 'Depende de la inicial'],
          correctIndex: 1,
          explanation: 'Menos de 3 meses de empleo es una prohibición absoluta. El ingreso no la compensa.',
        },
        {
          id: 'qq2',
          prompt: 'El cliente no puede dar inicial. ¿Qué le pasa a su puntaje?',
          options: ['Le restan puntos', 'No le pasa nada', 'Se rechaza automáticamente', 'Se le sube la tasa'],
          correctIndex: 1,
          explanation: 'No dar inicial no penaliza. Dar inicial sí suma un bono.',
        },
        {
          id: 'qq3',
          prompt: 'La cuota le representa el 45% de su ingreso mensual. Eso es:',
          options: ['Holgado', 'Ideal', 'Muy pesado — alto riesgo de mora', 'Irrelevante si tiene cédula'],
          correctIndex: 2,
          explanation: 'Por encima del 40% el factor de carga cae al mínimo. Es el perfil que más termina en mora.',
        },
        {
          id: 'qq4',
          prompt: '¿Dónde se cambian los pesos de cada factor del puntaje?',
          options: ['En la ficha del cliente', 'En Configuración → Pesos del motor de scoring', 'No se pueden cambiar', 'En Reportes'],
          correctIndex: 1,
          explanation: 'Están en Configuración y afectan a todos los clientes nuevos.',
        },
      ],
    },
  },
  {
    id: 'crs6',
    title: 'Mora y cartera vencida',
    category: 'cobranza',
    level: 'intermedio',
    durationMin: 30,
    description:
      'Cuándo una cuota se considera vencida, cómo se cobran las multas, y cómo leer el reporte de antigüedad de cartera para saber a quién perseguir primero.',
    lessons: [
      {
        id: 'l1',
        title: 'Cuándo una cuota está vencida',
        body: 'Una cuota se considera vencida cuando pasó su fecha de cobro y sigue sin pagarse. El sistema lo calcula solo comparando la fecha contra el día de hoy — nadie tiene que marcarla a mano. El mismo día del vencimiento todavía NO cuenta como vencida: el cliente tiene todo ese día para pagar.',
        keyTakeaway: 'La mora la detecta la fecha, no una persona. Nadie puede olvidar marcarla.',
      },
      {
        id: 'l2',
        title: 'El cliente se marca en mora solo',
        body: 'Si un cliente activo tiene aunque sea una cuota vencida, pasa automáticamente a estado "En mora" en todo el CRM: en el listado, en la ruta de cobro, en el calendario y en los reportes. Y en cuanto se pone al día, vuelve a "Activo" solo. Esto también le baja el puntaje de riesgo, porque el historial de pago es uno de los cinco factores.',
        keyTakeaway: 'Una sola cuota vencida marca al cliente completo. Ponerse al día lo revierte.',
      },
      {
        id: 'l3',
        title: 'Las multas por atraso',
        body: 'Hay 3 días de gracia después del vencimiento. A partir del cuarto día, el sistema cobra $4 por cada semana de atraso, y sigue sumando semana tras semana mientras la cuota no se pague. Las multas se aplican solas y quedan registradas por cliente, con el número de semana y la fecha en que se aplicó cada una.',
        keyTakeaway: '3 días de gracia, y después $4 por semana, automático.',
      },
      {
        id: 'l4',
        title: 'Antigüedad de cartera: los cuatro tramos',
        body: 'El reporte de antigüedad reparte lo que se debe en cuatro tramos: 1 a 30 días de atraso, 31 a 60, 61 a 90, y más de 90. La regla del oficio es simple: mientras más viejo el tramo, menos probable es cobrarlo. Una deuda de más de 90 días rara vez se recupera completa. Por eso se persigue primero lo que está en 1-30, no lo más viejo.',
        keyTakeaway: 'Persigue lo reciente. Lo de +90 días casi nunca se recupera entero.',
      },
      {
        id: 'l5',
        title: 'Los abonos parciales cuentan',
        body: 'Si un cliente debe $100 y abonó $40, en el reporte de cartera aparece debiendo $60, no $100. El sistema descuenta los abonos parciales del saldo. Registra siempre el abono en el momento: si no queda anotado, el reporte miente y la cobranza persigue un monto que ya no existe.',
        keyTakeaway: 'Abono que no se registra es dinero que el sistema sigue reclamando.',
      },
    ],
    quiz: {
      id: 'q6',
      questions: [
        {
          id: 'qq1',
          prompt: 'Una cuota vence hoy y el cliente todavía no ha pagado. ¿Está vencida?',
          options: ['Sí, desde la medianoche', 'No, tiene todo el día de hoy', 'Depende del monto', 'Solo si el cobrador la marca'],
          correctIndex: 1,
          explanation: 'El día del vencimiento todavía cuenta como plazo. Se vence al día siguiente.',
        },
        {
          id: 'qq2',
          prompt: '¿Cuántos días de gracia hay antes de que empiece a correr la multa?',
          options: ['Ninguno', '3 días', '7 días', '15 días'],
          correctIndex: 1,
          explanation: 'Son 3 días de gracia. Desde el cuarto empieza a contar la multa semanal.',
        },
        {
          id: 'qq3',
          prompt: 'Un cliente activo tiene una de sus seis cuotas vencida. ¿Cómo aparece?',
          options: ['Activo, solo esa cuota vencida', 'En mora en todo el sistema', 'Rechazado', 'Igual que antes'],
          correctIndex: 1,
          explanation: 'Basta una cuota vencida para que el cliente completo pase a "En mora".',
        },
        {
          id: 'qq4',
          prompt: 'Tienes deuda en 1-30 días y deuda en +90 días. ¿A quién persigues primero?',
          options: ['A la de +90, que lleva más tiempo', 'A la de 1-30 días', 'A la de mayor monto', 'Da igual'],
          correctIndex: 1,
          explanation: 'Mientras más fresca la deuda, más probable es cobrarla. Lo de +90 rara vez se recupera entero.',
        },
      ],
    },
  },
  {
    id: 'crs7',
    title: 'Operar el CRM: del registro al cobro',
    category: 'producto',
    level: 'inicial',
    durationMin: 30,
    description:
      'El recorrido completo dentro del programa: registrar al cliente, ver sus cuotas, cobrar en la calle y dejar constancia de todo.',
    lessons: [
      {
        id: 'l1',
        title: 'Registrar es suficiente',
        body: 'Al guardar un cliente nuevo con su fecha de primer cobro y su número de cuotas, el plan de pagos se crea solo y aparece de inmediato en Facturación. No hay que entrar después a generar nada. Si la venta quedó prohibida por riesgo, o marcaste al cliente como rechazado, el plan no se genera — es intencional.',
        keyTakeaway: 'Guardar el cliente ya crea sus cuotas. No hay segundo paso.',
      },
      {
        id: 'l2',
        title: 'Dónde va cada cuota',
        body: 'En Facturación, "Cuotas por cliente" te dice de un vistazo cuántas cuotas se le asignaron a cada persona, cuántas lleva pagadas y cuánto falta. Los clientes con cuotas vencidas salen de primeros. La barra se pone roja si hay mora, verde cuando queda saldado.',
        keyTakeaway: 'Un vistazo a "Cuotas por cliente" te dice quién está al día y quién no.',
      },
      {
        id: 'l3',
        title: 'El calendario manda',
        body: 'Los días de cobro se consultan en el calendario, no en una lista. Tocas un día y salen los clientes que pagan ese día, separando los de morosidad de los regulares. Tocas el nombre de un cliente y sale su tarjeta: monto, número de cuota, y los botones para marcar pagada o abrir su ficha completa.',
        keyTakeaway: 'Día → cliente → tarjeta. Ese es el camino para cobrar.',
      },
      {
        id: 'l4',
        title: 'Cambiar una fecha de cobro',
        body: 'Solo el administrador puede mover la fecha de una cuota. Se hace desde la tarjeta de la cuota en el calendario. Ojo: mover la fecha cambia cuándo esa cuota entra en mora y cuándo empiezan a correr las multas. Por eso cada cambio queda grabado en Auditoría con la fecha anterior y quién lo hizo.',
        keyTakeaway: 'Mover una fecha corre la mora. Queda registrado quién lo hizo.',
      },
      {
        id: 'l5',
        title: 'La bitácora es tu respaldo',
        body: 'Cada visita, llamada o mensaje se anota en la bitácora del cliente, con el canal usado y el resultado (contactado, no responde, compromiso de pago, rechazo). Eso es lo que después justifica una renegociación o una decisión de cobranza. Una gestión que no se anotó, para efectos prácticos, no ocurrió.',
        keyTakeaway: 'Gestión sin anotar es gestión perdida.',
      },
    ],
    quiz: {
      id: 'q7',
      questions: [
        {
          id: 'qq1',
          prompt: 'Registraste un cliente aprobado. ¿Qué hay que hacer para que aparezcan sus cuotas en Facturación?',
          options: ['Entrar y pulsar "Generar plan de pagos"', 'Nada, se crean solas', 'Crear cada factura a mano', 'Esperar al día del primer cobro'],
          correctIndex: 1,
          explanation: 'El plan se genera automáticamente al guardar el cliente.',
        },
        {
          id: 'qq2',
          prompt: '¿Dónde ves qué clientes cobras un día concreto?',
          options: ['En la lista de clientes', 'En el calendario de cobranzas', 'En Reportes', 'En Inventario'],
          correctIndex: 1,
          explanation: 'El calendario es la entrada: tocas el día y salen los clientes de ese día.',
        },
        {
          id: 'qq3',
          prompt: 'Un vendedor quiere correr la fecha de una cuota. ¿Puede?',
          options: ['Sí, cualquiera puede', 'Solo el administrador', 'Nadie puede', 'Solo si el cliente lo autoriza'],
          correctIndex: 1,
          explanation: 'Cambiar fechas es solo del administrador y queda registrado en Auditoría.',
        },
        {
          id: 'qq4',
          prompt: 'Visitaste a un cliente y quedó en pagar el viernes. ¿Qué haces?',
          options: ['Lo recuerdo y ya', 'Lo anoto en la bitácora con el resultado', 'Le mando un WhatsApp y listo', 'Espero al viernes'],
          correctIndex: 1,
          explanation: 'La bitácora es lo que respalda después una renegociación o una decisión de cobranza.',
        },
      ],
    },
  },
  {
    id: 'crs8',
    title: 'Dólares, euros y bolívares',
    category: 'producto',
    level: 'intermedio',
    durationMin: 20,
    description:
      'Por qué la deuda se lleva en dólares aunque se cobre en bolívares, y cómo usar la tasa del BCV dentro del CRM.',
    lessons: [
      {
        id: 'l1',
        title: 'La deuda vive en dólares',
        body: 'Todo lo que el cliente debe — precio, cuotas, saldo, multas — se guarda en dólares. El bolívar es la moneda en la que se cobra, no en la que se lleva la cuenta. Si guardáramos la deuda en bolívares, comparar las ventas de este mes con las del mes pasado no significaría nada, porque la tasa cambió en el medio.',
        keyTakeaway: 'Se cobra en bolívares, pero se debe en dólares. Así los números se pueden comparar.',
      },
      {
        id: 'l2',
        title: 'Ver los montos en otra moneda',
        body: 'Arriba a la derecha hay un selector de moneda. Al cambiarlo, TODOS los montos del CRM pasan a verse en dólares, euros o bolívares. No cambia ningún dato: es solo cómo se muestran. Cada usuario elige el suyo y se le recuerda para la próxima vez.',
        keyTakeaway: 'El selector cambia lo que ves, nunca lo que se debe.',
      },
      {
        id: 'l3',
        title: 'De dónde sale la tasa',
        body: 'La tasa la publica el BCV y el sistema la lee una vez al día. Si el BCV no publicó hoy — fin de semana o feriado — se usa la del último día hábil. Si su página falla, en Configuración → Tasa de cambio se puede escribir la tasa a mano para no quedarse sin poder ver bolívares.',
        keyTakeaway: 'Automática del BCV, con opción de escribirla a mano si falla.',
      },
      {
        id: 'l4',
        title: 'Escribir precios en euros',
        body: 'Al registrar el costo de un producto puedes escribirlo en euros en vez de dólares: eliges la moneda al lado del monto y el sistema te muestra en cuánto se guarda. El euro se calcula cruzando por el bolívar, porque eso es lo que publica el BCV; si falta alguna de las dos tasas, la opción de euros queda deshabilitada.',
        keyTakeaway: 'Puedes escribir en euros, pero se guarda convertido a dólares.',
      },
    ],
    quiz: {
      id: 'q8',
      questions: [
        {
          id: 'qq1',
          prompt: '¿En qué moneda se guarda la deuda del cliente?',
          options: ['En bolívares', 'En dólares', 'En euros', 'En la que se cobró'],
          correctIndex: 1,
          explanation: 'El dólar es la moneda de la deuda; el bolívar solo la de cobro.',
        },
        {
          id: 'qq2',
          prompt: 'Cambias el selector de moneda a bolívares. ¿Qué pasa con las deudas?',
          options: ['Se convierten y se guardan en Bs', 'Solo cambia cómo se ven', 'Se recalculan las cuotas', 'Se pierde el histórico'],
          correctIndex: 1,
          explanation: 'Es solo presentación. Ningún dato cambia.',
        },
        {
          id: 'qq3',
          prompt: 'Es domingo y el BCV no publicó tasa. ¿Qué muestra el CRM?',
          options: ['Cero', 'La del último día hábil', 'Un error', 'Nada, se bloquea'],
          correctIndex: 1,
          explanation: 'Usa la tasa más reciente disponible.',
        },
      ],
    },
  },
  {
    id: 'crs9',
    title: 'Ruta de cobro en la calle',
    category: 'cobranza',
    level: 'inicial',
    durationMin: 20,
    description:
      'Cómo aprovechar la ruta del día, por qué importa cargar la dirección del cliente, y qué hacer en cada visita.',
    lessons: [
      {
        id: 'l1',
        title: 'Qué hace la ruta y qué no',
        body: 'La ruta del día te da la lista de visitas ordenada por cercanía, para que no cruces la ciudad de ida y vuelta. Lo que NO hace es guiarte calle por calle: para eso abres cada parada en Waze o Google Maps desde el propio CRM. Duplicar un navegador no tendría sentido.',
        keyTakeaway: 'La ruta decide el orden; tu app de mapas decide el camino.',
      },
      {
        id: 'l2',
        title: 'Sin coordenadas no hay ruta',
        body: 'El orden por cercanía solo funciona si el cliente tiene su ubicación cargada. Por eso al registrar un cliente conviene llenar latitud y longitud, o usar el botón de ubicación actual estando en su casa. Un cliente sin coordenadas no se puede ordenar y termina al final de la lista.',
        keyTakeaway: 'Carga la ubicación cuando estés en la casa del cliente. Después es más difícil.',
      },
      {
        id: 'l3',
        title: 'Prioridad: primero los vencidos',
        body: 'La ruta separa los cobros de morosidad de los regulares. Los vencidos van primero porque cada semana que pasa baja la probabilidad de cobrar y suma $4 de multa que el cliente también va a discutir. Un cliente al día puede esperar a mañana; uno en mora, no.',
        keyTakeaway: 'El moroso primero. El que está al día puede esperar.',
      },
      {
        id: 'l4',
        title: 'Cerrar bien la visita',
        body: 'Al terminar cada visita: si cobraste, marca la cuota como pagada en el momento; si no, anota en la bitácora qué pasó y cuál fue el compromiso. Dejar la anotación para el final del día es como no anotarla — se olvidan los detalles que después hacen falta.',
        keyTakeaway: 'Marca o anota en el momento, frente a la casa. No al final del día.',
      },
    ],
    quiz: {
      id: 'q9',
      questions: [
        {
          id: 'qq1',
          prompt: '¿La ruta de cobro te guía calle por calle?',
          options: ['Sí, tiene navegación propia', 'No, ordena las paradas y abres tu app de mapas', 'Solo en Caracas', 'Solo con internet'],
          correctIndex: 1,
          explanation: 'Ordena las visitas; la navegación la hace Waze o Google Maps.',
        },
        {
          id: 'qq2',
          prompt: 'Un cliente no tiene latitud ni longitud cargadas. ¿Qué pasa?',
          options: ['No se puede cobrar', 'No se puede ordenar por cercanía', 'Se borra de la ruta', 'Se le cobra doble'],
          correctIndex: 1,
          explanation: 'Sin coordenadas no entra en el ordenamiento por cercanía.',
        },
        {
          id: 'qq3',
          prompt: 'Tienes un moroso lejos y uno al día cerca. ¿A quién priorizas?',
          options: ['Al que está cerca', 'Al moroso', 'Al de mayor monto', 'Da igual'],
          correctIndex: 1,
          explanation: 'Cada semana de atraso baja la probabilidad de cobro y suma multa.',
        },
      ],
    },
  },
  // ============================================================
  // Psicología aplicada a la venta y la cobranza.
  // Contenido de oficio, no del programa. Se apoya en hallazgos
  // establecidos de economía del comportamiento (dolor de pagar,
  // contabilidad mental, sesgo del presente) y en los principios
  // de influencia de Cialdini, siempre con el límite ético por
  // delante: en venta a crédito, convencer a alguien que no puede
  // pagar no es una venta, es una mora futura.
  // ============================================================
  {
    id: 'crs10',
    title: 'Por qué la gente compra a crédito',
    category: 'ventas',
    level: 'intermedio',
    durationMin: 35,
    description:
      'Qué pasa en la cabeza del cliente cuando decide financiar: el dolor de pagar, la contabilidad mental y por qué el futuro se siente lejos.',
    lessons: [
      {
        id: 'l1',
        title: 'El dolor de pagar',
        body: 'Entregar dinero activa en el cerebro algo parecido al dolor físico. Mientras más visible y concentrado es el pago, más duele: soltar $400 de una vez duele mucho más que pagar $34 quincenales, aunque al final sea más caro. El crédito no elimina ese dolor, lo reparte en pedazos pequeños. Por eso una cuota se acepta con facilidad donde el precio de contado espantaba.',
        keyTakeaway: 'No vendes un precio más bajo: vendes un dolor repartido.',
      },
      {
        id: 'l2',
        title: 'Contabilidad mental',
        body: 'Las personas no manejan un solo bolsillo: separan mentalmente el dinero en cajones — "esto es de la comida", "esto es del alquiler". Una cuota quincenal entra fácil en el cajón de los gastos fijos; un desembolso grande no tiene cajón donde meterse. Cuando presentas la cuota junto a otros gastos fijos que el cliente ya paga sin pensar, le estás dando un lugar donde guardarla.',
        keyTakeaway: 'Ubica la cuota en un cajón mental que el cliente ya tiene abierto.',
      },
      {
        id: 'l3',
        title: 'El futuro se siente lejos',
        body: 'Somos malos evaluando compromisos futuros: lo que pasa hoy pesa muchísimo más que lo que pasará en seis meses. El cliente siente hoy el gusto de llevarse la nevera y siente apenas de refilón las once cuotas que vienen. Eso te facilita el cierre, pero es exactamente el mismo mecanismo que produce la mora. Tu trabajo no es aprovecharlo, es compensarlo: hazle sentir la cuota antes de firmar, no después.',
        keyTakeaway: 'El sesgo que te ayuda a cerrar es el que después te genera la mora.',
      },
      {
        id: 'l4',
        title: 'Anclaje y encuadre',
        body: 'El primer número que escucha el cliente se le queda pegado y todo lo demás lo compara contra él. Si abres con el precio de contado, la cuota parece un alivio. Y la misma cifra cambia según cómo la digas: "$34 quincenales" y "$68 al mes" son lo mismo, pero no se sienten igual. Esto no es truco: es elegir la unidad que el cliente realmente usa para pensar su presupuesto.',
        keyTakeaway: 'Habla en la unidad en que el cliente piensa su plata: la quincena.',
      },
      {
        id: 'l5',
        title: 'El límite: vender no es convencer a cualquiera',
        body: 'Todo lo anterior sirve para que un cliente que SÍ puede pagar entienda la oferta y se decida. Usarlo con alguien que no puede pagar es fabricarte una mora, una visita perdida y un cliente que te evita. El sistema ya te dice cuándo el perfil no da: cuando lo diga, la psicología no es para pelearle al número, es para explicarle al cliente por qué todavía no.',
        keyTakeaway: 'Si el score dice que no, la técnica no está para forzar el sí.',
      },
    ],
    quiz: {
      id: 'q10',
      questions: [
        {
          id: 'qq1',
          prompt: '¿Por qué una cuota quincenal se acepta más fácil que el precio de contado?',
          options: ['Porque sale más barato', 'Porque reparte el dolor de pagar en pedazos pequeños', 'Porque el cliente no sabe sumar', 'Porque no tiene intereses'],
          correctIndex: 1,
          explanation: 'Pagar duele; repartirlo en montos pequeños reduce ese dolor aunque el total sea mayor.',
        },
        {
          id: 'qq2',
          prompt: 'El cliente siente mucho el beneficio de hoy y poco las cuotas futuras. Eso:',
          options: ['Es bueno, cierra más rápido', 'Facilita el cierre pero es la raíz de la mora', 'No existe', 'Solo pasa con clientes nuevos'],
          correctIndex: 1,
          explanation: 'El sesgo del presente ayuda a cerrar y después produce el incumplimiento. Hay que compensarlo antes de firmar.',
        },
        {
          id: 'qq3',
          prompt: 'El score dice "venta prohibida" pero el cliente insiste mucho. ¿Qué haces?',
          options: ['Aplicas técnicas hasta convencerlo', 'Le explicas por qué todavía no se puede', 'Bajas la inicial', 'Le pides que traiga un fiador'],
          correctIndex: 1,
          explanation: 'Convencer a quien no puede pagar es fabricar una mora. La técnica sirve para explicar, no para forzar.',
        },
      ],
    },
  },
  {
    id: 'crs11',
    title: 'Influencia ética en la venta',
    category: 'ventas',
    level: 'avanzado',
    durationMin: 40,
    description:
      'Los seis resortes que mueven una decisión, cómo usarlos con honestidad, y cómo reconocer cuándo te los están aplicando a ti.',
    lessons: [
      {
        id: 'l1',
        title: 'Reciprocidad',
        body: 'Cuando alguien nos da algo primero, sentimos la necesidad de devolver. Un cálculo de cuotas hecho con cuidado, una recomendación honesta que no te conviene, resolver una duda que no era tu problema — todo eso crea reciprocidad genuina. La versión falsa (un "regalo" que en realidad es parte del precio) se nota y destruye la confianza.',
        keyTakeaway: 'Da algo de valor real antes de pedir. Los regalos falsos se huelen.',
      },
      {
        id: 'l2',
        title: 'Compromiso y coherencia',
        body: 'Las personas quieren ser consistentes con lo que ya dijeron. Si el cliente dice en voz alta "sí, necesito reemplazar esa nevera este mes", tiende a actuar en consecuencia. En cobranza esto es todavía más fuerte: un compromiso concreto y dicho por el cliente ("le pago el viernes al mediodía") se cumple mucho más que uno vago ("yo le aviso").',
        keyTakeaway: 'Haz que el compromiso lo diga el cliente, con día y hora.',
      },
      {
        id: 'l3',
        title: 'Prueba social',
        body: 'Miramos a los demás para decidir, sobre todo cuando somos parecidos. "Tres vecinos de esta misma calle tienen el plan" convence más que cualquier argumento técnico. Requisito: tiene que ser verdad y tiene que ser gente parecida al cliente. Inventar vecinos es la forma más rápida de perder un barrio completo, porque acá todos se conocen.',
        keyTakeaway: 'La prueba social funciona con gente parecida y solo si es cierta.',
      },
      {
        id: 'l4',
        title: 'Autoridad y simpatía',
        body: 'Hacemos caso a quien demuestra saber, y le compramos a quien nos cae bien. La autoridad se construye conociendo de verdad el producto y el plan: si titubeas con el cálculo de la cuota, la perdiste. La simpatía se construye con interés genuino, no con halagos. Ambas son lentas de ganar e instantáneas de perder.',
        keyTakeaway: 'Domina tu cálculo y muestra interés real. Nada de esto se improvisa.',
      },
      {
        id: 'l5',
        title: 'Escasez, con cuidado',
        body: 'Lo que escasea se desea más. "Quedan dos en inventario" mueve la decisión — si es verdad. La escasez inventada es la técnica más usada y la que más rápido quema tu reputación en una zona donde los clientes hablan entre ellos. Si de verdad quedan dos, dilo. Si no, no.',
        keyTakeaway: 'La escasez solo se usa cuando es real. En un barrio, la mentira se sabe.',
      },
      {
        id: 'l6',
        title: 'La prueba de la almohada',
        body: 'Una forma sencilla de saber si cruzaste la línea: ¿estarías cómodo si el cliente escuchara la grabación de tu conversación un año después, ya con las cuotas encima? Si la respuesta es no, no lo hagas. En venta a crédito el cliente no desaparece después de firmar: lo vas a ver cada quince días durante un año.',
        keyTakeaway: 'Vas a ver a este cliente cada quince días. Véndele como si eso importara.',
      },
    ],
    quiz: {
      id: 'q11',
      questions: [
        {
          id: 'qq1',
          prompt: 'Un compromiso de pago se cumple más si:',
          options: ['Lo dices tú por él', 'Lo dice el cliente con día y hora concretos', 'Se lo mandas por escrito', 'Le subes la multa'],
          correctIndex: 1,
          explanation: 'El compromiso dicho por el propio cliente y concreto activa la coherencia.',
        },
        {
          id: 'qq2',
          prompt: 'No quedan pocas unidades, pero decirlo ayudaría a cerrar. ¿Lo dices?',
          options: ['Sí, es una técnica normal', 'No — la escasez falsa quema tu reputación en la zona', 'Solo con clientes nuevos', 'Solo si el jefe lo autoriza'],
          correctIndex: 1,
          explanation: 'En cobranza puerta a puerta los clientes se conocen entre sí. Una mentira se propaga.',
        },
        {
          id: 'qq3',
          prompt: 'La prueba social funciona mejor cuando los ejemplos son:',
          options: ['Famosos', 'Personas parecidas al cliente y reales', 'De otra ciudad', 'Del vendedor mismo'],
          correctIndex: 1,
          explanation: 'Nos comparamos con gente parecida. Y tiene que ser verdad.',
        },
        {
          id: 'qq4',
          prompt: '¿Cuál es la "prueba de la almohada"?',
          options: ['Dormir antes de decidir', 'Preguntarte si estarías cómodo si el cliente oyera la conversación un año después', 'Consultar con el supervisor', 'Revisar el contrato'],
          correctIndex: 1,
          explanation: 'Es el filtro ético rápido: el cliente sigue ahí después de firmar.',
        },
      ],
    },
  },
  {
    id: 'crs12',
    title: 'Psicología de la cobranza',
    category: 'cobranza',
    level: 'avanzado',
    durationMin: 35,
    description:
      'Por qué el moroso no contesta el teléfono, cómo pedir dinero sin romper la relación, y cómo conseguir compromisos que se cumplan.',
    lessons: [
      {
        id: 'l1',
        title: 'La vergüenza hace desaparecer al cliente',
        body: 'El que no puede pagar rara vez está huyendo por vivo: la mayoría no contesta porque le da vergüenza. Evitar la llamada le quita el malestar por un rato. Si tu primer contacto suena a reclamo, confirmas su miedo y refuerzas la evitación. Si suena a "vengo a ver cómo lo resolvemos", le quitas el motivo para esconderse.',
        keyTakeaway: 'No contesta por vergüenza, no por vivo. Quítale el motivo para esconderse.',
      },
      {
        id: 'l2',
        title: 'Separar a la persona del problema',
        body: 'Ataca la deuda, nunca a la persona. "Usted es un irresponsable" pone al cliente a defenderse de ti en vez de ocuparse del pago. "Tenemos un saldo de $60 con tres semanas de atraso, ¿cómo lo resolvemos?" pone el problema afuera, sobre la mesa, y los deja a los dos del mismo lado mirándolo.',
        keyTakeaway: 'El problema va sobre la mesa, no entre ustedes dos.',
      },
      {
        id: 'l3',
        title: 'Compromisos que sí se cumplen',
        body: 'Un compromiso vago no es un compromiso. Tres cosas lo vuelven real: que sea concreto (monto, día y hora), que lo diga el cliente en sus propias palabras, y que quede anotado y repetido en voz alta. "¿Entonces quedamos en que el viernes a las 3 me tiene los $30?" cierra el círculo. Anótalo en la bitácora delante de él: el gesto mismo le da peso.',
        keyTakeaway: 'Monto, día y hora, dicho por él, anotado delante de él.',
      },
      {
        id: 'l4',
        title: 'Quitar fricción',
        body: 'Mucha mora no es falta de dinero, es falta de facilidad. Cada obstáculo — no saber cuánto debe exactamente, no tener el número de cuenta a mano, no coincidir con el cobrador — es una excusa que el cerebro agradece. Llegar con el monto exacto calculado y la forma de pago lista elimina esas salidas.',
        keyTakeaway: 'Llega con el monto exacto y la forma de pagar resuelta.',
      },
      {
        id: 'l5',
        title: 'La escalera de contacto',
        body: 'La presión sube por peldaños, no de golpe: primero el recordatorio amable antes del vencimiento, después el contacto el día siguiente, luego la visita, después la renegociación formal, y solo al final el escalamiento. Saltarse peldaños quema la relación y no acelera nada. Cada peldaño se anota, porque es lo que justifica pasar al siguiente.',
        keyTakeaway: 'Sube un peldaño a la vez, y anota cada uno.',
      },
      {
        id: 'l6',
        title: 'Renegociar no es perder',
        body: 'Un cliente que renegocia y paga vale infinitamente más que uno que se esconde y nunca paga. Estirar el plazo o bajar la cuota cuando la situación del cliente cambió de verdad recupera dinero que de otro modo se iba a perder — y conserva a alguien que va a volver a comprar. Lo que no funciona es renegociar con quien simplemente no quiere pagar.',
        keyTakeaway: 'Renegocia con quien no puede. Con quien no quiere, escala.',
      },
    ],
    quiz: {
      id: 'q12',
      questions: [
        {
          id: 'qq1',
          prompt: 'El cliente lleva tres días sin contestar. La razón más común es:',
          options: ['Se está burlando', 'Vergüenza y evitación', 'Cambió de número', 'Se mudó'],
          correctIndex: 1,
          explanation: 'La mayoría evita el contacto por incomodidad, no por astucia.',
        },
        {
          id: 'qq2',
          prompt: '¿Cuál compromiso tiene más probabilidad de cumplirse?',
          options: ['"Yo le aviso cuando pueda"', '"El viernes a las 3 le tengo los $30"', '"La próxima semana veo"', '"Apenas cobre le pago"'],
          correctIndex: 1,
          explanation: 'Concreto, con monto, día y hora. Los demás son vaguedades.',
        },
        {
          id: 'qq3',
          prompt: 'Un cliente perdió el empleo y quiere renegociar. ¿Qué conviene?',
          options: ['Negarse, es su problema', 'Renegociar: recuperas dinero que si no se pierde', 'Escalar de inmediato', 'Aplicarle doble multa'],
          correctIndex: 1,
          explanation: 'Con quien no puede pagar, renegociar recupera dinero. Escalar se reserva para quien no quiere.',
        },
        {
          id: 'qq4',
          prompt: 'Llegas a cobrar sin saber el monto exacto de la deuda. Eso:',
          options: ['Da igual', 'Le regala al cliente una excusa para no pagar hoy', 'Es más flexible', 'Genera confianza'],
          correctIndex: 1,
          explanation: 'Cada fricción es una salida cómoda. Llega con el número exacto.',
        },
      ],
    },
  },
  {
    id: 'crs13',
    title: 'Escuchar y preguntar',
    category: 'ventas',
    level: 'inicial',
    durationMin: 25,
    description:
      'La habilidad que más vende y menos se practica: hacer que el cliente hable y de verdad escuchar lo que dice.',
    lessons: [
      {
        id: 'l1',
        title: 'El que pregunta, dirige',
        body: 'En una conversación de venta manda quien pregunta, no quien más habla. Una regla práctica: el cliente debería hablar más que tú. Si sales de una visita habiendo hablado el 80% del tiempo, no vendiste — expusiste, que es distinto.',
        keyTakeaway: 'Si hablaste más que el cliente, no fue una venta: fue una exposición.',
      },
      {
        id: 'l2',
        title: 'Preguntas abiertas',
        body: 'Las preguntas de sí o no cierran la conversación; las abiertas la abren. "¿Le interesa la nevera?" se responde con un no y se acabó. "¿Qué problema le está dando la que tiene ahora?" te da la necesidad real, la urgencia y, muchas veces, el presupuesto — todo sin haberlo pedido.',
        keyTakeaway: 'Cambia "¿le interesa?" por "¿qué problema tiene hoy?".',
      },
      {
        id: 'l3',
        title: 'El silencio trabaja para ti',
        body: 'Después de preguntar algo importante, cállate. El silencio incomoda y la gente lo llena — normalmente con la información más valiosa de toda la conversación. La mayoría de los vendedores arruina esto rellenando el silencio con otra pregunta o con un argumento. Aguanta tres segundos. Se hacen eternos y funcionan.',
        keyTakeaway: 'Pregunta y cállate. El cliente llenará el silencio.',
      },
      {
        id: 'l4',
        title: 'Escuchar de verdad',
        body: 'Escuchar no es esperar tu turno para hablar. Se demuestra devolviéndole al cliente lo que dijo con tus palabras: "Entonces, si entendí bien, lo que le preocupa no es el precio sino que la cuota le caiga en la quincena floja". Si acertaste, el cliente se abre; si te equivocaste, te corrige — y ganas igual, porque ahora sí sabes.',
        keyTakeaway: 'Repite con tus palabras lo que entendiste. Aciertes o no, ganas.',
      },
      {
        id: 'l5',
        title: 'Escuchar también protege',
        body: 'Preguntar bien no solo vende: te evita colocarle un crédito a quien no lo va a poder pagar. "¿Cómo le quedaría esta cuota en un mes flojo?" es una pregunta de venta y de riesgo al mismo tiempo. La respuesta te dice si estás cerrando una venta o firmando una mora.',
        keyTakeaway: 'La misma pregunta que cierra la venta te avisa del riesgo.',
      },
    ],
    quiz: {
      id: 'q13',
      questions: [
        {
          id: 'qq1',
          prompt: 'En una buena visita de venta, ¿quién habla más?',
          options: ['El vendedor', 'El cliente', 'Los dos igual', 'Depende del producto'],
          correctIndex: 1,
          explanation: 'El cliente debe hablar más. Si expusiste todo tú, no vendiste.',
        },
        {
          id: 'qq2',
          prompt: '¿Cuál es una pregunta abierta?',
          options: ['¿Le interesa?', '¿Se la llevo mañana?', '¿Qué problema le da la que tiene ahora?', '¿Puede pagar $34?'],
          correctIndex: 2,
          explanation: 'Las abiertas no se responden con sí o no y revelan la necesidad real.',
        },
        {
          id: 'qq3',
          prompt: 'Hiciste una pregunta importante y el cliente se queda callado. ¿Qué haces?',
          options: ['Haces otra pregunta', 'Argumentas', 'Aguantas el silencio', 'Te despides'],
          correctIndex: 2,
          explanation: 'El silencio se llena con la información más valiosa. Aguántalo.',
        },
      ],
    },
  },
  {
    id: 'crs14',
    title: 'Tus propios sesgos como vendedor',
    category: 'ventas',
    level: 'avanzado',
    durationMin: 30,
    description:
      'Los errores de juicio que comete el vendedor —no el cliente— y que terminan convertidos en cartera vencida.',
    lessons: [
      {
        id: 'l1',
        title: 'Optimismo con el cliente simpático',
        body: 'Cuando alguien nos cae bien, le suponemos cualidades que no hemos verificado: si es amable, asumimos que es cumplidor. No tiene relación. El cliente más encantador de tu cartera puede ser el que más te haga caminar. Para eso está el score: es la parte del juicio que no se deja llevar por la simpatía.',
        keyTakeaway: 'Simpático no es sinónimo de cumplidor. Por eso existe el puntaje.',
      },
      {
        id: 'l2',
        title: 'Buscar solo lo que confirma',
        body: 'Cuando ya decidimos que una venta va, empezamos a fijarnos solo en lo que la apoya y a restarle importancia a lo que la contradice. "Sí, lleva poco en el trabajo, pero se ve serio". Ese "pero" es la señal de alarma. Cuando te oigas justificando por qué esta vez la regla no aplica, para.',
        keyTakeaway: 'Si te oyes diciendo "sí, pero...", estás justificando, no evaluando.',
      },
      {
        id: 'l3',
        title: 'El costo hundido',
        body: 'Llevas cuatro visitas con el mismo prospecto y no cierra. La tentación es seguir insistiendo "porque ya invertí mucho tiempo". Ese tiempo ya se gastó y no vuelve, decidas lo que decidas. La única pregunta válida es si la quinta visita vale más que dedicar ese rato a otro cliente.',
        keyTakeaway: 'El tiempo ya gastado no cuenta. Solo cuenta qué conviene ahora.',
      },
      {
        id: 'l4',
        title: 'La meta del mes nubla',
        body: 'Los últimos días del mes son los que más mora producen. Con la meta encima, el mismo perfil que habrías rechazado el día 5 de pronto "se puede intentar". Esa venta forzada te sube el número este mes y te lo baja los seis siguientes, entre visitas perdidas y comisión que nunca se cobró.',
        keyTakeaway: 'La venta que fuerzas para la meta la pagas los seis meses siguientes.',
      },
      {
        id: 'l5',
        title: 'Para qué sirve un sistema',
        body: 'Ninguno de estos sesgos se corrige con fuerza de voluntad ni con experiencia — los expertos los tienen igual. Se corrigen con reglas fijadas antes, cuando estabas frío: umbrales de ingreso, antigüedad mínima, prohibiciones. El sistema no está para desconfiar de ti; está para protegerte de ti mismo un martes 29 con la meta a medias.',
        keyTakeaway: 'Las reglas se fijan en frío justamente para sostenerte en caliente.',
      },
    ],
    quiz: {
      id: 'q14',
      questions: [
        {
          id: 'qq1',
          prompt: 'Un cliente te cae muy bien y es conversador. Sobre su cumplimiento de pago eso indica:',
          options: ['Que es más probable que pague', 'Nada', 'Que se le puede dar más plazo', 'Que no hace falta el score'],
          correctIndex: 1,
          explanation: 'La simpatía no predice el cumplimiento. El efecto halo nos hace creer que sí.',
        },
        {
          id: 'qq2',
          prompt: 'Te escuchas diciendo "lleva poco en el trabajo, pero se ve serio". Eso es señal de:',
          options: ['Buen ojo comercial', 'Sesgo de confirmación: estás justificando', 'Experiencia', 'Empatía'],
          correctIndex: 1,
          explanation: 'El "pero" que salva una regla es la señal clásica de que estás justificando una decisión ya tomada.',
        },
        {
          id: 'qq3',
          prompt: 'Llevas cuatro visitas sin cerrar. ¿Qué pregunta corresponde?',
          options: ['¿Cómo recupero el tiempo invertido?', '¿Vale más la quinta visita que atender a otro cliente?', '¿Le bajo la cuota?', '¿Insisto una vez más porque ya invertí?'],
          correctIndex: 1,
          explanation: 'El tiempo gastado no vuelve. Solo importa el uso siguiente de tu tiempo.',
        },
        {
          id: 'qq4',
          prompt: '¿Por qué los últimos días del mes producen más mora?',
          options: ['La gente cobra después', 'La presión de la meta relaja el criterio de riesgo', 'Hay más visitas', 'Por el clima'],
          correctIndex: 1,
          explanation: 'Con la meta encima se aprueban perfiles que en frío se habrían rechazado.',
        },
      ],
    },
  },
];

// ============================================================
// Objection playbook (R.E.S.)
// ============================================================

export const OBJECTIONS: Objection[] = [
  {
    id: 'ob1',
    text: '"Está muy caro, lo vi más barato en otra parte."',
    context: 'Cliente compara precio sin considerar valor ni financiamiento.',
    difficulty: 'frecuente',
    resSteps: [
      {
        phase: 'relacion',
        label: 'Relación',
        technique: 'Validar la preocupación sin confrontar.',
        script:
          'Entiendo perfectamente, uno siempre busca el mejor precio. ¿Me permite mostrarle por qué nuestro plan hace la diferencia?',
      },
      {
        phase: 'educacion',
        label: 'Educación',
        technique: 'Reencuadrar de precio a cuota y valor total.',
        script:
          'El precio al contado puede parecer mayor, pero con nuestro crédito usted paga en cómodas cuotas quincenales y con garantía incluida. Comparemos la cuota mensual, no el total.',
      },
      {
        phase: 'solucion',
        label: 'Solución',
        technique: 'Ofrecer un plan concreto que reduzca la cuota.',
        script:
          'Podemos ajustar la inicial al 25% y estirar el plazo a 12 meses. Su cuota bajaría a un monto muy cómodo. ¿Le parece si lo calculo ahora?',
      },
    ],
  },
  {
    id: 'ob2',
    text: '"Tengo que pensarlo, le aviso."',
    context: 'Cliente evita el compromiso; raíz probable: desconfianza o flujo de caja.',
    difficulty: 'frecuente',
    resSteps: [
      {
        phase: 'relacion',
        label: 'Relación',
        technique: 'Normalizar la pausa sin presión.',
        script: 'Claro, es una decisión importante. Quiero asegurarme de que tenga toda la información.',
      },
      {
        phase: 'educacion',
        label: 'Educación',
        technique: 'Explorar la raíz con pregunta abierta.',
        script:
          'Para ayudarle mejor, ¿hay algo específico que le gustaría revisar: el monto de la cuota, la frecuencia, o las condiciones del crédito?',
      },
      {
        phase: 'solucion',
        label: 'Solución',
        technique: 'Fijar un micro-compromiso.',
        script:
          'Le propongo esto: le envío hoy el plan detallado por WhatsApp y conversamos mañana a las 10am. Sin compromiso. ¿Le parece?',
      },
    ],
  },
  {
    id: 'ob3',
    text: '"Las cuotas son muy altas, no llego a fin de mes."',
    context: 'Objeción real de flujo de caja; requiere reestructuración.',
    difficulty: 'compleja',
    resSteps: [
      {
        phase: 'relacion',
        label: 'Relación',
        technique: 'Empatizar con la realidad económica.',
        script: 'Lo entiendo, fin de mes siempre es apretado. Vamos a buscar un plan que sí se acomode a su ritmo.',
      },
      {
        phase: 'educacion',
        label: 'Educación',
        technique: 'Mostrar opciones de frecuencia y plazo.',
        script:
          'Tenemos frecuencia semanal, quincenal y mensual. La semanal divide la carga en montos más pequeños; el plazo más largo baja cada cuota.',
      },
      {
        phase: 'solucion',
        label: 'Solución',
        technique: 'Proponer plan semanal extendido.',
        script:
          'Si pasamos a pagos semanales a 18 meses, su cuota semanal sería muy manejable. ¿Le muestro el desglose?',
      },
    ],
  },
  {
    id: 'ob4',
    text: '"No confío en los créditos, siempre hay letra pequeña."',
    context: 'Cliente con experiencia negativa previa; requiere reconstruir confianza.',
    difficulty: 'agresiva',
    resSteps: [
      {
        phase: 'relacion',
        label: 'Relación',
        technique: 'Validar la desconfianza sin defenderse.',
        script:
          'Tiene razón en desconfiar, hay empresas que no son transparentes. Por eso le voy a mostrar todo en limpio.',
      },
      {
        phase: 'educacion',
        label: 'Educación',
        technique: 'Transparencia total del costo financiero.',
        script:
          'Le entrego el cronograma completo: cuota fija, sin cargos ocultos, sin penalización por prepago. Lo que ve es lo que paga.',
      },
      {
        phase: 'solucion',
        label: 'Solución',
        technique: 'Ofrecer prueba de buena fe.',
        script:
          'Le propongo un plan a 6 meses con derecho a prepago sin multa. Si en el primer mes no se siente cómodo, puede saldar el saldo sin penalización.',
      },
    ],
  },
];

// ============================================================
// Roleplay simulator — branching tree
// ============================================================

export const ROLEPLAY_TREE: Record<string, RoleplayNode> = {
  start: {
    id: 'start',
    speaker: 'cliente',
    text:
      'Hola, vi el anuncio del televisor, pero la verdad es que está carísimo. No creo que pueda pagarlo.',
    options: [
      {
        id: 'o1',
        text: 'Entiendo. ¿Le interesaría verlo financiado en cuotas pequeñas?',
        next: 'n1',
        resPhase: 'relacion',
        quality: 'optima',
        feedback: 'Bien: empatizas y ofreces el crédito como solución.',
      },
      {
        id: 'o2',
        text: 'No es caro, es el precio justo.',
        next: 'n2',
        quality: 'pobre',
        feedback: 'Evita confrontar al cliente. Empatiza primero.',
      },
      {
        id: 'o3',
        text: 'Le puedo dar un descuento ahora mismo.',
        next: 'n3',
        resPhase: 'solucion',
        quality: 'aceptable',
        feedback: 'Cedes valor sin explorar la objeción. Mejor reencuadrar primero.',
      },
    ],
  },
  n1: {
    id: 'n1',
    speaker: 'cliente',
    text: '¿Cuotas? ¿Y cuánto quedaría por semana?',
    options: [
      {
        id: 'o4',
        text: 'Con una inicial del 20%, su cuota semanal sería de unos 32 dólares. ¿Le parece?',
        next: 'n4',
        resPhase: 'educacion',
        quality: 'optima',
        feedback: 'Excelente: das cifras concretas y frecuencia manejable.',
      },
      {
        id: 'o5',
        text: 'Déjeme calcular y le aviso.',
        next: 'n5',
        quality: 'pobre',
        feedback: 'Pierdes el momentum. Lleva el cálculo a mano.',
      },
    ],
  },
  n2: {
    id: 'n2',
    speaker: 'cliente',
    text: 'Bueno, igual déjme pensarlo.',
    outcome: 'retry',
    feedback: 'El cliente se cierra. Reinicia y empatiza primero.',
  },
  n3: {
    id: 'n3',
    speaker: 'cliente',
    text: '¿Un descuento? Hmm, ¿pero las cuotas igual son altas?',
    options: [
      {
        id: 'o6',
        text: 'Podemos bajar la cuota si estiramos el plazo a 12 meses. ¿Le muestro?',
        next: 'n4',
        resPhase: 'solucion',
        quality: 'optima',
        feedback: 'Bien: reestructuras el plazo para resolver la raíz.',
      },
      {
        id: 'o7',
        text: 'No, ya le di descuento, no puedo más.',
        next: 'n5',
        quality: 'pobre',
        feedback: 'Cierras la puerta. Explora opciones antes de negar.',
      },
    ],
  },
  n4: {
    id: 'n4',
    speaker: 'cliente',
    text: 'Mmm, 32 a la semana sí es manejable. ¿Y si me atraso una semana?',
    options: [
      {
        id: 'o8',
        text: 'Tenemos 3 días de gracia sin recargo. Y si necesita, podemos renegociar esa cuota. Todo documentado.',
        next: 'n6',
        resPhase: 'solucion',
        quality: 'optima',
        feedback: 'Perfecto: anticipas la duda y ofreces respaldo.',
      },
      {
        id: 'o9',
        text: 'Si se atrasa, hay recargo. Así es el crédito.',
        next: 'n5',
        quality: 'pobre',
        feedback: 'Tono amenazante. Reencuadra como respaldo, no como castigo.',
      },
    ],
  },
  n5: {
    id: 'n5',
    speaker: 'cliente',
    text: 'Mmm, déjme pensarlo bien y le llamo.',
    outcome: 'lose',
    feedback: 'El cliente se enfría. Revisa tu técnica de cierre.',
  },
  n6: {
    id: 'n6',
    speaker: 'cliente',
    text: 'Me parece bien. ¿Cómo empezamos?',
    outcome: 'win',
    feedback: '¡Cerraste la venta! Usaste R.E.S. correctamente.',
  },
};
