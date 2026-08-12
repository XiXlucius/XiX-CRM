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
