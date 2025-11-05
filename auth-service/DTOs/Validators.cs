using FluentValidation;

namespace AuthService.DTOs;

/// <summary>
/// Validator cho RegisterRequest
/// </summary>
public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email không được để trống")
            .EmailAddress().WithMessage("Email không đúng định dạng")
            .MaximumLength(255).WithMessage("Email không được quá 255 ký tự");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Mật khẩu không được để trống")
            .MinimumLength(6).WithMessage("Mật khẩu phải có ít nhất 6 ký tự")
            .MaximumLength(100).WithMessage("Mật khẩu không được quá 100 ký tự");

        RuleFor(x => x.ConfirmPassword)
            .NotEmpty().WithMessage("Xác nhận mật khẩu không được để trống")
            .Equal(x => x.Password).WithMessage("Xác nhận mật khẩu không khớp");

        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("Tên không được để trống")
            .MaximumLength(100).WithMessage("Tên không được quá 100 ký tự");

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Họ không được để trống")
            .MaximumLength(100).WithMessage("Họ không được quá 100 ký tự");

        RuleFor(x => x.PhoneNumber)
            .MaximumLength(20).WithMessage("Số điện thoại không được quá 20 ký tự")
            .Matches(@"^[\d\-\+\(\)\s]+$").WithMessage("Số điện thoại không đúng định dạng")
            .When(x => !string.IsNullOrEmpty(x.PhoneNumber));

        RuleFor(x => x.IdentityNumber)
            .MaximumLength(50).WithMessage("Số CMND/CCCD không được quá 50 ký tự")
            .When(x => !string.IsNullOrEmpty(x.IdentityNumber));
    }
}

/// <summary>
/// Validator cho LoginRequest
/// </summary>
public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email không được để trống")
            .EmailAddress().WithMessage("Email không đúng định dạng");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Mật khẩu không được để trống");
    }
}

/// <summary>
/// Validator cho RefreshTokenRequest
/// </summary>
public class RefreshTokenRequestValidator : AbstractValidator<RefreshTokenRequest>
{
    public RefreshTokenRequestValidator()
    {
        RuleFor(x => x.RefreshToken)
            .NotEmpty().WithMessage("Refresh token không được để trống");
    }
}
