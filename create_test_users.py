#!/usr/bin/env python3

import asyncio
import os
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
import uuid
from datetime import datetime

# Add backend to path to import our models
sys.path.append('/app/backend')

async def create_test_users():
    # Connect to MongoDB
    mongo_url = "mongodb://localhost:27017"
    client = AsyncIOMotorClient(mongo_url)
    db = client["test_database"]
    
    # Hash passwords
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Create test users
    test_users = [
        {
            "id": str(uuid.uuid4()),
            "username": "admin",
            "email": "admin@medical.com",
            "password_hash": hash_password("admin123"),
            "role": "admin",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "username": "user",
            "email": "user@medical.com", 
            "password_hash": hash_password("user123"),
            "role": "user",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "username": "tecnico",
            "email": "tecnico@medical.com",
            "password_hash": hash_password("tecnico123"),
            "role": "user",
            "created_at": datetime.utcnow()
        }
    ]
    
    # Clear existing users and insert test users
    await db.users.delete_many({})
    await db.users.insert_many(test_users)
    
    print("✅ Usuários de teste criados com sucesso!")
    print("\n📋 Credenciais de login:")
    print("🔐 Admin: admin / admin123")
    print("👤 Usuário: user / user123") 
    print("🔧 Técnico: tecnico / tecnico123")
    
    # Create sample equipment
    sample_equipment = [
        {
            "id": str(uuid.uuid4()),
            "name": "Respirador Mecânico",
            "model": "VM-3000",
            "manufacturer": "MedTech",
            "serial_number": "MT2024001",
            "description": "Respirador para UTI com ventilação invasiva e não invasiva",
            "location": "UTI - Ala Norte",
            "status": "active",
            "installation_date": datetime(2024, 1, 15),
            "created_by": test_users[0]["id"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Monitor Multiparamétrico",
            "model": "MP-500",
            "manufacturer": "CardioCorp",
            "serial_number": "CC2024002",
            "description": "Monitor de sinais vitais com ECG, SpO2, PA",
            "location": "Enfermaria - Quarto 201",
            "status": "active",
            "installation_date": datetime(2024, 2, 10),
            "created_by": test_users[0]["id"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Bomba de Infusão",
            "model": "BI-200",
            "manufacturer": "InfusaMed",
            "serial_number": "IM2024003",
            "description": "Bomba de infusão volumétrica de alta precisão",
            "location": "Centro Cirúrgico - Sala 1",
            "status": "maintenance",
            "installation_date": datetime(2023, 12, 5),
            "created_by": test_users[0]["id"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    await db.equipment.delete_many({})
    await db.equipment.insert_many(sample_equipment)
    
    # Create sample tickets
    sample_tickets = [
        {
            "id": str(uuid.uuid4()),
            "equipment_id": sample_equipment[1]["id"],
            "title": "Alarme de bateria disparando",
            "description": "O monitor está emitindo alarme de bateria fraca mesmo conectado à rede elétrica. Necessária verificação técnica.",
            "status": "open",
            "priority": "high",
            "created_by": test_users[1]["id"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "equipment_id": sample_equipment[2]["id"],
            "title": "Manutenção preventiva programada",
            "description": "Realizar manutenção preventiva trimestral conforme cronograma.",
            "status": "in_progress",
            "priority": "medium",
            "created_by": test_users[0]["id"],
            "assigned_to": test_users[2]["id"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    await db.tickets.delete_many({})
    await db.tickets.insert_many(sample_tickets)
    
    print("\n📦 Dados de exemplo criados:")
    print(f"   • {len(sample_equipment)} equipamentos")
    print(f"   • {len(sample_tickets)} chamados")
    
    # Close connection
    client.close()
    print("\n🚀 Sistema pronto para uso!")

if __name__ == "__main__":
    asyncio.run(create_test_users())