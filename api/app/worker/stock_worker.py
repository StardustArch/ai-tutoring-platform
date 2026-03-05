import asyncio
import httpx
import logging
import sys
import os

# Configuração de Logs Profissional
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("StockWorker")

# Configurações via Variáveis de Ambiente (mais seguro)
# Em local, podes usar http://localhost:3000
# Em Docker/Produção, usa o nome do serviço ou URL real
NEST_API_URL_ENV = os.getenv("PUBLIC_API_URL", "http://backend:3000")
NEST_API_URL = f"{NEST_API_URL_ENV}/api/admin/refill-stock"
CHECK_INTERVAL = int(os.getenv("STOCK_CHECK_INTERVAL", "3600")) # Padrão: 1 hora

async def check_and_refill():
    """
    Este Worker atua como o 'gerente de armazém'.
    Ele avisa o NestJS para verificar quais tópicos estão com pouco estoque.
    """
    logger.info(f"🚀 Worker de Stock iniciado. Alvo: {NEST_API_URL}")
    
    # Timeout longo pois a geração de muitas questões pode demorar
    async with httpx.AsyncClient(timeout=600.0) as client:
        while True:
            try:
                logger.info("🕵️ Verificando níveis de estoque no armazém...")
                
                # Chamada para o endpoint administrativo no NestJS
                response = await client.post(f"{NEST_API_URL}")
                
                if response.status_code in [200, 201]:
                    data = response.json()
                    logger.info(f"✅ Sucesso: {data.get('message', 'Reposição concluída')}")
                else:
                    logger.error(f"❌ Falha ao solicitar reposição (Status {response.status_code}): {response.text}")
                
            except httpx.ConnectError:
                logger.error(f"🚨 Não foi possível conectar ao Backend em {NEST_API_URL}. O servidor está online?")
            except Exception as e:
                logger.error(f"🚨 Erro inesperado no Worker de Stock: {e}")
            
            logger.info(f"😴 Próxima verificação em {CHECK_INTERVAL/60:.1f} minutos...")
            await asyncio.sleep(CHECK_INTERVAL)

if __name__ == "__main__":
    try:
        asyncio.run(check_and_refill())
    except KeyboardInterrupt:
        logger.info("Encerrando Worker de forma graciosa...")
        sys.exit(0)