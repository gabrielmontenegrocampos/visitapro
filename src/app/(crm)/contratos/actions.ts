'use server'

import { createClient as adminCreate } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function adminClient() {
  return adminCreate(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ── Template ─────────────────────────────────────────────────────────────────

function buildContractHtml(data: {
  contractNumber: string
  lead: { name: string; company: string | null; address: string | null; number: string | null; complement: string | null; neighborhood: string | null; city: string | null }
  proposal: { title: string; value: number; payment_terms: string | null; memorial_descritivo: string | null }
  company: { name: string | null; legal_name: string | null; document: string | null; document_type: string | null; address: string | null; number: string | null; neighborhood: string | null; city: string | null; state: string | null; whatsapp: string | null; phone: string | null }
}): string {
  const { contractNumber, lead, proposal, company } = data

  const clientName = lead.company ?? lead.name
  const clientAddr = [lead.address, lead.number, lead.complement, lead.neighborhood, lead.city]
    .filter(Boolean).join(', ')

  const companyName = company.legal_name ?? company.name ?? 'CONTRATADA'
  const companyDoc = company.document
    ? `inscrita no ${(company.document_type ?? 'cnpj').toUpperCase()} sob o nº ${company.document}, `
    : ''
  const companyAddr = [company.address, company.number, company.neighborhood, company.city, company.state]
    .filter(Boolean).join(', ')
  const companyPhone = company.whatsapp ?? company.phone ?? ''

  const valueFormatted = proposal.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const paymentTerms = proposal.payment_terms
    ? `<p>${proposal.payment_terms.replace(/\n/g, '</p><p>')}</p>`
    : '<p>[Descrever forma de pagamento]</p>'
  const scopeContent = proposal.memorial_descritivo
    ? `<p>${proposal.memorial_descritivo.replace(/\n/g, '</p><p>')}</p>`
    : '<p>[Descrever detalhadamente os serviços contratados, áreas, quantitativos e especificações técnicas.]</p>'

  return `<h1 style="text-align: center">CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE REFORMA, PINTURA E TRATAMENTO DE FACHADA</h1>
<p style="text-align: center"><strong>${contractNumber}</strong></p>
<p>&nbsp;</p>
<p>Pelo presente instrumento particular, as partes abaixo qualificadas ajustam entre si o presente Contrato de Prestação de Serviços de Reforma, Pintura, Tratamento de Superfícies e Serviços Correlatos, que será regido pelas cláusulas e condições seguintes.</p>
<p>&nbsp;</p>
<h2>CLÁUSULA PRIMEIRA - DAS PARTES</h2>
<p><strong>CONTRATANTE:</strong> ${clientName}${clientAddr ? ', estabelecido em ' + clientAddr : ''}, neste ato representado por seu(ua) responsável.</p>
<p>&nbsp;</p>
<p><strong>CONTRATADA:</strong> ${companyName}, ${companyDoc}com sede em ${companyAddr || '[endereço da empresa]'}${companyPhone ? ', telefone ' + companyPhone : ''}, neste ato representada por sua titular.</p>
<p>&nbsp;</p>
<h2>CLÁUSULA SEGUNDA - DO OBJETO DO CONTRATO</h2>
<p>O presente contrato tem por objeto a prestação de serviços de <strong>${proposal.title}</strong>, incluindo mão de obra, materiais, ferramentas, equipamentos, insumos, mobilização, limpeza e desmobilização, exclusivamente conforme o escopo descrito no ANEXO I deste instrumento.</p>
<p>Parágrafo primeiro. O escopo contratado limita-se às áreas, quantitativos e serviços expressamente descritos no ANEXO I. Não estão incluídas intervenções em sistemas, elementos ou patologias não descritos, nem serviços que excedam os limites quantitativos contratados, salvo mediante orçamento complementar e termo aditivo.</p>
<p>Parágrafo segundo. A execução dos serviços observará as condições reais do local, as limitações técnicas existentes, as condições climáticas, a liberação das áreas pela CONTRATANTE e as boas práticas aplicáveis ao preparo de superfícies e pintura predial.</p>
<p>&nbsp;</p>
<h2>CLÁUSULA TERCEIRA - DO PREÇO</h2>
<p>O valor total ajustado para a execução integral dos serviços contratados é de <strong>${valueFormatted}</strong>.</p>
<p>Parágrafo único. O preço foi estabelecido com base no escopo descrito no ANEXO I. Qualquer alteração, acréscimo, necessidade técnica imprevista ou serviço extra dependerá de orçamento complementar e termo aditivo, conforme cláusula própria deste contrato.</p>
<p>&nbsp;</p>
<h2>CLÁUSULA QUARTA - DA FORMA DE PAGAMENTO</h2>
<p>A CONTRATANTE pagará à CONTRATADA o valor total de <strong>${valueFormatted}</strong>, da seguinte forma:</p>
${paymentTerms}
<p>Parágrafo primeiro. Os pagamentos deverão ser realizados preferencialmente por PIX.</p>
<p>Parágrafo segundo. O comprovante de pagamento deverá ser enviado à CONTRATADA por meio eletrônico, para fins de controle financeiro e validação.</p>
<p>Parágrafo terceiro. Caso a conclusão dos serviços ocorra antes do vencimento das parcelas vincendas, o cronograma financeiro permanecerá conforme pactuado, salvo acordo escrito em sentido diverso entre as partes.</p>
<p>&nbsp;</p>
<h2>CLÁUSULA QUINTA - DO PRAZO E INÍCIO DA OBRA</h2>
<p>A obra terá início em até 10 (dez) dias úteis contados da confirmação do pagamento da primeira parcela do adiantamento contratual, desde que este contrato esteja assinado e as áreas de trabalho estejam integralmente liberadas pela CONTRATANTE.</p>
<p>Parágrafo primeiro. O prazo previsto para execução e entrega da obra será de ______ dias úteis, contados a partir da data de efetivo início da obra, considerada como tal a data da mobilização inicial da equipe no local.</p>
<p>Parágrafo segundo. O prazo poderá ser prorrogado, sem caracterizar inadimplemento da CONTRATADA, pelos dias em que a obra permanecer total ou parcialmente paralisada em razão de caso fortuito ou força maior, inclusive chuvas, umidade excessiva, ventos fortes ou outras condições climáticas que tecnicamente impeçam a execução segura e adequada dos serviços.</p>
<p>Parágrafo terceiro. Os dias de paralisação decorrentes das hipóteses previstas no parágrafo anterior serão automaticamente acrescidos ao prazo contratual de execução e ao período adicional de tolerância previsto na cláusula de multa por atraso.</p>
<p>&nbsp;</p>
<h2>CLÁUSULA SEXTA - DOS ITENS INCLUSOS</h2>
<p>Mão de obra, materiais, ferramentas, equipamentos e insumos necessários à execução dos serviços previstos no ANEXO I.</p>
<p>Mobilização da equipe, EPIs, alimentação, passagens/combustível, ART da obra, ART dos equipamentos, seguro da obra e locações necessárias ao escopo.</p>
<p>Isolamento e proteção das áreas, sinalização, instalação dos equipamentos e limpeza das superfícies.</p>
<p>Limpeza final do ambiente de trabalho, descarte definitivo do entulho gerado pelo escopo contratado e desmobilização.</p>
<p>&nbsp;</p>
<h2>CLÁUSULA SÉTIMA - DOS ITENS NÃO INCLUSOS</h2>
<p>Não estão inclusos no presente contrato, salvo termo aditivo específico:</p>
<ul>
<li>Substituição de esquadrias, vidros, contramarcos, tubulações, ralos, prumadas, calhas, rufos, juntas ou instalações hidráulicas/elétricas;</li>
<li>Recuperação ou substituição integral de revestimentos, reboco, emboço, cerâmicas, pastilhas ou elementos de fachada, exceto nos pontos e limites expressamente previstos no ANEXO I;</li>
<li>Remoção ou fornecimento de elementos construtivos com quantitativos acima dos limites previstos no ANEXO I;</li>
<li>Recuperações estruturais distintas das previstas no escopo contratado;</li>
<li>Reparos em áreas danificadas por terceiros, usuários, prestadores do contratante ou intervenções posteriores;</li>
<li>Ensaios laboratoriais, laudos técnicos, perícias, projetos técnicos complementares ou ARTs de projeto, salvo previsão expressa;</li>
<li>Serviços em áreas não descritas no ANEXO I.</li>
</ul>
<p>&nbsp;</p>
<h2>CLÁUSULA OITAVA - DAS RESPONSABILIDADES DA CONTRATADA</h2>
<ul>
<li>Executar os serviços conforme o escopo contratado, as boas práticas técnicas e as condições do local;</li>
<li>Fornecer mão de obra, materiais, ferramentas e equipamentos necessários aos serviços contratados;</li>
<li>Fornecer EPIs e orientar sua equipe quanto à segurança, organização e limpeza do ambiente de trabalho;</li>
<li>Comunicar à CONTRATANTE, sempre que identificadas condições impeditivas, riscos técnicos ou necessidade de serviço adicional;</li>
<li>Emitir termo de entrega ou finalização dos serviços ao término da execução, quando aplicável;</li>
<li>Responder pelas obrigações trabalhistas, previdenciárias, fiscais e operacionais relativas à sua equipe.</li>
</ul>
<p>&nbsp;</p>
<h2>CLÁUSULA NONA - DAS RESPONSABILIDADES DA CONTRATANTE</h2>
<ul>
<li>Liberar as áreas de trabalho, livres de obstáculos, materiais soltos e interferências que impeçam a execução;</li>
<li>Comunicar previamente aos condôminos/moradores sobre a execução dos serviços, horários, restrições de circulação e eventuais transtornos;</li>
<li>Fornecer acesso à obra durante os horários previamente acordados;</li>
<li>Disponibilizar água, energia elétrica e sanitário para uso da equipe durante a execução;</li>
<li>Impedir o trânsito de pessoas não autorizadas nas áreas em execução;</li>
<li>Acompanhar e validar as etapas executadas;</li>
<li>Cumprir pontualmente o cronograma de pagamento;</li>
<li>Realizar, após a entrega, as manutenções preventivas e corretivas necessárias à preservação dos sistemas executados, nos termos do ANEXO II.</li>
</ul>
<p>&nbsp;</p>
<h2>CLÁUSULA DÉCIMA - DO ADITIVO POR SERVIÇO EXTRA</h2>
<p>Nenhum serviço não previsto expressamente no ANEXO I será considerado incluído no preço contratado.</p>
<p>Parágrafo primeiro. Caso, durante a execução, sejam identificadas condições ocultas, deteriorações não aparentes, falhas de substrato, necessidade técnica não contemplada no escopo inicial, a CONTRATADA comunicará a CONTRATANTE e apresentará orçamento complementar, quando cabível.</p>
<p>Parágrafo segundo. A execução de serviços extras dependerá de aprovação prévia e expressa da CONTRATANTE, por escrito, inclusive por meio eletrônico, com definição de preço, prazo e forma de pagamento.</p>
<p>Parágrafo terceiro. A recusa da CONTRATANTE em aprovar serviço adicional necessário poderá limitar a responsabilidade técnica da CONTRATADA ao escopo originalmente contratado, especialmente quando a condição não corrigida influenciar no desempenho dos serviços executados.</p>
<p>&nbsp;</p>
<h2>CLÁUSULA DÉCIMA PRIMEIRA - DO HORÁRIO DE TRABALHO</h2>
<p>Os serviços serão executados, preferencialmente, de segunda a sexta-feira, em horário comercial, observadas as normas internas do condomínio, as condições de segurança, a legislação aplicável e as exigências técnicas da obra.</p>
<p>Parágrafo único. O horário poderá ser ajustado conforme normas internas do local, exigências técnicas, condições climáticas, segurança da equipe e andamento dos serviços.</p>
<p>&nbsp;</p>
<h2>CLÁUSULA DÉCIMA SEGUNDA - DO INADIMPLEMENTO, MULTA, JUROS E SUSPENSÃO</h2>
<p>Em caso de atraso no pagamento de qualquer parcela, incidirão sobre o valor vencido multa moratória de 2% (dois por cento), juros de mora de 1% (um por cento) ao mês, calculados pro rata die, e correção monetária pelo IPCA, ou outro índice que venha a substituí-lo.</p>
<p>Parágrafo primeiro. O atraso de qualquer pagamento autoriza a CONTRATADA a suspender imediatamente a execução dos serviços, sem que tal suspensão configure atraso, abandono de obra ou inadimplemento da CONTRATADA.</p>
<p>Parágrafo segundo. O prazo contratual será automaticamente prorrogado pelo período de suspensão, acrescido do tempo necessário à remobilização da equipe.</p>
<p>Parágrafo terceiro. Persistindo o inadimplemento por prazo superior a 10 (dez) dias corridos, a CONTRATADA poderá rescindir o contrato, fazendo jus ao recebimento dos serviços executados, materiais adquiridos, custos de mobilização, desmobilização e demais despesas comprovadamente assumidas.</p>
<p>&nbsp;</p>
<h2>CLÁUSULA DÉCIMA TERCEIRA - DA MULTA POR ATRASO NA ENTREGA DA OBRA</h2>
<p>Será concedido à CONTRATADA período adicional de tolerância de 30 (trinta) dias úteis além do prazo ordinário de execução. A multa prevista nesta cláusula somente será exigível se a obra não estiver concluída após o prazo ordinário acrescido da tolerância de 30 (trinta) dias úteis.</p>
<p>Parágrafo primeiro. Ultrapassado o limite, incidirá multa moratória diária de 0,5% (zero vírgula cinco por cento) sobre o valor total do contrato por dia útil de atraso imputável à CONTRATADA.</p>
<p>Parágrafo segundo. Para fins de contagem dos prazos desta cláusula, não serão computados os dias de paralisação ou impedimento decorrentes de caso fortuito ou força maior, nos termos da CLÁUSULA QUINTA.</p>
<p>Parágrafo terceiro. A multa não incidirá durante períodos em que a execução estiver suspensa por motivo de caso fortuito ou força maior, desde que a CONTRATADA comunique a CONTRATANTE e registre a ocorrência e o período de paralisação.</p>
<p>&nbsp;</p>
<h2>CLÁUSULA DÉCIMA QUARTA - DO ENCERRAMENTO E ENTREGA DOS SERVIÇOS</h2>
<p>Concluídos os serviços, a CONTRATADA poderá emitir Termo de Entrega de Obra, Termo de Finalização de Obra ou documento equivalente, indicando a conclusão do escopo contratado.</p>
<p>Parágrafo primeiro. Eventuais não conformidades deverão ser apontadas pela CONTRATANTE por escrito, com descrição objetiva e fotos, no prazo de até 5 (cinco) dias corridos após a comunicação de conclusão.</p>
<p>Parágrafo segundo. Não havendo manifestação formal no prazo acima, os serviços serão considerados aceitos quanto aos aspectos aparentes de acabamento, limpeza e organização final.</p>
<p>&nbsp;</p>
<h2>CLÁUSULA DÉCIMA QUINTA - DA GARANTIA</h2>
<p>Parágrafo primeiro. A garantia aplica-se exclusivamente às áreas efetivamente executadas pela CONTRATADA e aos serviços expressamente descritos no ANEXO I, observados os prazos específicos definidos no ANEXO II conforme o sistema, o componente e o tipo de falha.</p>
<p>Parágrafo segundo. Os prazos previstos no ANEXO II não se confundem com vida útil, durabilidade indefinida, prazo legal para reclamação de vícios ou responsabilidade por solidez e segurança prevista no art. 618 do Código Civil, quando juridicamente aplicável.</p>
<p>Parágrafo terceiro. A garantia não cobre falhas decorrentes de uso inadequado, ausência ou deficiência de manutenção, intervenções de terceiros, perfurações, avarias, reformas posteriores, problemas estruturais, movimentações da edificação, falhas em substratos ou elementos não executados pela CONTRATADA, infiltrações de origem diversa, vazamentos, caso fortuito, força maior ou eventos externos.</p>
<p>&nbsp;</p>
<h2>CLÁUSULA DÉCIMA SEXTA - DA RESCISÃO</h2>
<p>O presente contrato poderá ser rescindido por comum acordo, por inadimplemento contratual, por impossibilidade técnica superveniente, por descumprimento das obrigações assumidas ou por motivo de força maior.</p>
<p>Parágrafo único. Em caso de rescisão, a CONTRATADA terá direito ao recebimento proporcional pelos serviços executados, materiais adquiridos, custos de mobilização, desmobilização e demais despesas comprovadamente assumidas em razão do contrato, sem prejuízo das multas e encargos aplicáveis em caso de inadimplemento.</p>
<p>&nbsp;</p>
<h2>CLÁUSULA DÉCIMA SÉTIMA - DO FORO</h2>
<p>As partes elegem o foro da Comarca de ____________________ para dirimir quaisquer controvérsias oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>
<p>&nbsp;</p>
<p>E, por estarem justas e contratadas, as partes assinam o presente instrumento em 02 (duas) vias de igual teor e forma, juntamente com 02 (duas) testemunhas.</p>
<p>&nbsp;</p>
<p>____________________, ____ de __________________ de 20____.</p>
<p>&nbsp;</p>
<p>&nbsp;</p>
<p style="text-align: center">__________________________________</p>
<p style="text-align: center"><strong>CONTRATANTE</strong></p>
<p style="text-align: center">${clientName}</p>
<p>&nbsp;</p>
<p style="text-align: center">__________________________________</p>
<p style="text-align: center"><strong>CONTRATADA</strong></p>
<p style="text-align: center">${companyName}</p>
<p>&nbsp;</p>
<p style="text-align: center">__________________________________</p>
<p style="text-align: center">Testemunha 1</p>
<p>&nbsp;</p>
<p style="text-align: center">__________________________________</p>
<p style="text-align: center">Testemunha 2</p>
<p>&nbsp;</p>
<hr>
<p>&nbsp;</p>
<h2 style="text-align: center">ANEXO I — ESCOPO DOS SERVIÇOS CONTRATADOS</h2>
<p>O presente Anexo I descreve exclusivamente os serviços contratados para <strong>${proposal.title}</strong>.</p>
<p>&nbsp;</p>
${scopeContent}
<p>&nbsp;</p>
<p><em>Observações técnicas: A execução depende de condições climáticas adequadas, liberação das áreas, disponibilidade de água e energia e ausência de trânsito de pessoas não autorizadas nas frentes de trabalho. Serviços adicionais identificados durante a execução dependerão de orçamento complementar aprovado por escrito.</em></p>
<p>&nbsp;</p>
<hr>
<p>&nbsp;</p>
<h2 style="text-align: center">ANEXO II — TERMO DE GARANTIA</h2>
<p>O presente Termo de Garantia integra o contrato de prestação de serviços firmado entre as partes e disciplina a abrangência, os prazos, as condições de atendimento, as responsabilidades da CONTRATANTE e as hipóteses de exclusão ou perda da garantia relacionadas exclusivamente aos serviços executados pela CONTRATADA.</p>
<p>&nbsp;</p>
<p><strong>1. INÍCIO DA GARANTIA</strong></p>
<p>Os prazos de garantia terão início na data de emissão do Termo de Entrega de Obra, Termo de Finalização de Obra ou documento equivalente que ateste a conclusão dos serviços contratados.</p>
<p>&nbsp;</p>
<p><strong>2. ABRANGÊNCIA E PRAZOS</strong></p>
<p>A garantia aplica-se exclusivamente às áreas efetivamente executadas pela CONTRATADA, conforme o ANEXO I, e cobre somente falhas comprovadamente decorrentes da execução, em alinhamento com as diretrizes da ABNT NBR 17170:2022:</p>
<ul>
<li>Pintura externa emborrachada elastomérica: <strong>5 anos</strong></li>
<li>Textura rolada externa: <strong>5 anos</strong></li>
<li>Pintura interna (garagem, corredores): <strong>3 anos</strong></li>
<li>Pintura de portões e elementos metálicos: <strong>3 anos</strong></li>
<li>Reparos em revestimento argamassado — aderência: <strong>3 anos</strong></li>
<li>Reparos em revestimento argamassado — dessolidarização: <strong>5 anos</strong></li>
<li>Tratamento de trincas e fissuras: <strong>3 anos</strong></li>
<li>Recuperação pontual de cerâmicas: <strong>5 anos</strong></li>
<li>Rejuntamento e acabamento cerâmico: <strong>1 ano</strong></li>
<li>Recuperação estrutural localizada: <strong>5 anos</strong></li>
<li>Demarcação de barrados no piso: <strong>2 anos</strong></li>
</ul>
<p>&nbsp;</p>
<p><strong>3. O QUE ESTÁ COBERTO</strong></p>
<p>Falhas de aderência, descascamento, desplacamento, pulverulência, craqueamento ou formação de bolhas diretamente relacionadas à preparação ou aplicação executada pela CONTRATADA.</p>
<p>&nbsp;</p>
<p><strong>4. O QUE NÃO ESTÁ COBERTO</strong></p>
<p>Infiltrações originadas fora dos sistemas tratados; falhas decorrentes de esquadrias, tubulações, calhas, telhados ou instalações não executadas pela CONTRATADA; danos causados por terceiros, impactos, reformas posteriores; desgaste natural por uso e intempéries; omissão de manutenção pela CONTRATANTE.</p>
<p>&nbsp;</p>
<p><strong>5. RESPONSABILIDADES DA CONTRATANTE PARA PRESERVAÇÃO DA GARANTIA</strong></p>
<ul>
<li>Realizar inspeção visual preventiva, no mínimo, a cada 6 (seis) meses;</li>
<li>Manter ralos, grelhas, bocais, rufos e áreas adjacentes limpos e desobstruídos;</li>
<li>Não permitir perfurações, fixações ou reformas nas áreas tratadas sem prévia orientação técnica;</li>
<li>Comunicar imediatamente a CONTRATADA em caso de identificação de qualquer anomalia;</li>
<li>Permitir o acesso da CONTRATADA para vistoria técnica.</li>
</ul>
<p>&nbsp;</p>
<p><strong>6. PROCEDIMENTO PARA ACIONAMENTO</strong></p>
<p>A CONTRATANTE deverá comunicar a ocorrência por escrito, descrevendo o local, a data de identificação, os sintomas e, sempre que possível, fotos. A CONTRATADA realizará vistoria técnica e, constatada falha coberta, realizará o reparo em prazo razoável.</p>
<p>&nbsp;</p>
<p>Belo Horizonte/MG, ____ de __________________ de 20____.</p>
<p>&nbsp;</p>
<p style="text-align: center">__________________________________</p>
<p style="text-align: center"><strong>CONTRATANTE</strong></p>
<p>&nbsp;</p>
<p style="text-align: center">__________________________________</p>
<p style="text-align: center"><strong>CONTRATADA</strong></p>
<p>&nbsp;</p>
<hr>
<p>&nbsp;</p>
<h2 style="text-align: center">ANEXO III — MEMORIAL DESCRITIVO DE MATERIAIS</h2>
<p>Materiais de referência indicados para as aplicações previstas no escopo contratado, observadas as especificações técnicas dos fabricantes e a compatibilidade com as condições reais das superfícies.</p>
<p>&nbsp;</p>
<p>[Descrever os materiais de referência para cada tipo de serviço: marcas, especificações, acabamentos e cores a serem utilizados.]</p>
<p>&nbsp;</p>
<p><em>A utilização de produto tecnicamente equivalente ou similar dependerá de compatibilidade com o sistema existente e com a finalidade prevista no ANEXO I. As cores, acabamentos e eventuais substituições de marcas deverão ser previamente alinhados entre as partes.</em></p>`
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getContratosList() {
  const admin = adminClient()
  const { data } = await admin
    .from('contracts')
    .select('id, contract_number, title, status, created_at, updated_at, lead_id, proposal_id, leads(id, name, company), proposals(id, title, value)')
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getAcceptedProposalsWithoutContract() {
  const admin = adminClient()
  const { data: existing } = await admin.from('contracts').select('proposal_id').not('proposal_id', 'is', null)
  const usedIds = (existing ?? []).map((c: any) => c.proposal_id).filter(Boolean)

  let q = admin
    .from('proposals')
    .select('id, title, value, leads(id, name, company)')
    .eq('status', 'aceita')
    .order('created_at', { ascending: false })

  if (usedIds.length > 0) {
    q = q.not('id', 'in', `(${usedIds.join(',')})`)
  }

  const { data } = await q
  return data ?? []
}

export async function getContrato(id: string) {
  const admin = adminClient()
  const { data } = await admin
    .from('contracts')
    .select('*, leads(id, name, company, address, number, complement, neighborhood, city), proposals(id, title, value, payment_terms)')
    .eq('id', id)
    .single()
  return data
}

export async function saveContratoHeader(id: string, header_content: string) {
  const admin = adminClient()
  const { error } = await admin.from('contracts').update({ header_content }).eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

export async function saveContratoFooter(id: string, footer_content: string) {
  const admin = adminClient()
  const { error } = await admin.from('contracts').update({ footer_content }).eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createContrato(proposalId: string) {
  const admin = adminClient()

  // Busca proposta com lead e configurações da empresa
  const [{ data: proposal }, { data: companyCfg }] = await Promise.all([
    admin
      .from('proposals')
      .select('id, title, value, payment_terms, memorial_descritivo, lead_id, leads(id, name, company, address, number, complement, neighborhood, city)')
      .eq('id', proposalId)
      .single(),
    admin.from('company_settings').select('*').single(),
  ])

  if (!proposal) return { error: 'Proposta não encontrada', id: null }

  const leadData = (proposal as any).leads
  if (!leadData) return { error: 'Lead não encontrado', id: null }

  // Gera número sequencial
  const year = new Date().getFullYear()
  const { count } = await admin
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .like('contract_number', `CONT-${year}-%`)
  const seq = String((count ?? 0) + 1).padStart(3, '0')
  const contractNumber = `CONT-${year}-${seq}`

  const content = buildContractHtml({
    contractNumber,
    lead: leadData,
    proposal: {
      title: proposal.title,
      value: proposal.value,
      payment_terms: proposal.payment_terms,
      memorial_descritivo: proposal.memorial_descritivo,
    },
    company: companyCfg ?? {
      name: null, legal_name: null, document: null, document_type: null,
      address: null, number: null, neighborhood: null, city: null, state: null,
      whatsapp: null, phone: null,
    },
  })

  const { data, error } = await admin
    .from('contracts')
    .insert({
      proposal_id: proposalId,
      lead_id: leadData.id,
      contract_number: contractNumber,
      title: `Contrato — ${leadData.company ?? leadData.name}`,
      content,
      status: 'rascunho',
    })
    .select('id')
    .single()

  if (error) return { error: error.message, id: null }

  revalidatePath('/contratos')
  return { error: null, id: data.id }
}

export async function saveContrato(id: string, content: string) {
  const admin = adminClient()
  const { error } = await admin
    .from('contracts')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

export async function updateContratoStatus(id: string, status: string) {
  const admin = adminClient()
  const { error } = await admin.from('contracts').update({ status }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/contratos')
  revalidatePath(`/contratos/${id}`)
  return { error: null }
}

export async function updateContratoTitle(id: string, title: string) {
  const admin = adminClient()
  const { error } = await admin.from('contracts').update({ title }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/contratos')
  return { error: null }
}

export async function deleteContrato(id: string) {
  const admin = adminClient()
  const { error } = await admin.from('contracts').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/contratos')
  return { error: null }
}
