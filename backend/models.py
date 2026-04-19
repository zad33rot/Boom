from pydantic import BaseModel
from typing import Optional

class EmailReq(BaseModel): 
    email: str

class CodeReq(BaseModel): 
    email: str
    code: str

class FinalRegReq(BaseModel): 
    email: str
    code: str
    username: str
    nickname: str
    password: str

class LoginReq(BaseModel): 
    email: str
    password: str