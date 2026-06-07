# backend/schemas/__init__.py
from marshmallow import Schema, fields, validate, ValidationError
import re


def validate_email(email):
    if not re.match(r"^[\w\.-]+@[\w\.-]+\.\w+$", email):
        raise ValidationError("Invalid email format")


def validate_username(username):
    if len(username) < 3 or len(username) > 50:
        raise ValidationError("Username must be 3-50 characters")
    if not re.match(r"^[\w-]+$", username):
        raise ValidationError(
            "Username can only contain letters, numbers, underscores, and hyphens"
        )


class UserRegisterSchema(Schema):
    email = fields.Email(required=True, validate=validate_email)
    username = fields.Str(required=True, validate=validate_username)
    password = fields.Str(required=True, validate=validate.Length(min=6))


class UserLoginSchema(Schema):
    email = fields.Str(required=True)
    password = fields.Str(required=True)


class PromptCreateSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=3, max=255))
    content = fields.Str(required=True, validate=validate.Length(min=10))
    description = fields.Str(allow_none=True)
    theme_id = fields.Int(required=True, validate=validate.Range(min=1))
    tags = fields.List(fields.Str(), required=True, validate=validate.Length(min=1))

    # Для FormData нужно отдельно обрабатывать в API


class PromptUpdateSchema(Schema):
    title = fields.Str(validate=validate.Length(min=3, max=255))
    content = fields.Str(validate=validate.Length(min=10))
    description = fields.Str(allow_none=True)
    theme_id = fields.Int(validate=validate.Range(min=1))
    tags = fields.List(fields.Str())


class CommentCreateSchema(Schema):
    content = fields.Str(required=True, validate=validate.Length(min=2, max=2000))


class ProfileUpdateSchema(Schema):
    bio = fields.Str(allow_none=True, validate=validate.Length(max=500))
    birth_date = fields.Date(allow_none=True)
    city = fields.Str(allow_none=True, validate=validate.Length(max=100))
    telegram = fields.Str(allow_none=True, validate=validate.Length(max=32))
    github = fields.Str(allow_none=True, validate=validate.Length(max=39))
    website = fields.Url(allow_none=True)
    privacy_settings = fields.Dict(allow_none=True)
