using FluentValidation;

namespace AuthService.DTOs;

/// <summary>
/// Validator cho RegisterRequest
/// Sử dụng FluentValidation để validate dữ liệu đầu vào khi đăng ký
/// </summary>
public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    /// <summary>
    /// Constructor - Định nghĩa các rules validation
    /// </summary>
    public RegisterRequestValidator()
    {
        // Rule cho Email
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email không được để trống")
            .EmailAddress().WithMessage("Email không đúng định dạng")
            .MaximumLength(255).WithMessage("Email không được quá 255 ký tự");

        // Rule cho Password
        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Mật khẩu không được để trống")
            .MinimumLength(6).WithMessage("Mật khẩu phải có ít nhất 6 ký tự")
            .MaximumLength(100).WithMessage("Mật khẩu không được quá 100 ký tự");

        // Rule cho ConfirmPassword - phải khớp với Password
        RuleFor(x => x.ConfirmPassword)
            .NotEmpty().WithMessage("Xác nhận mật khẩu không được để trống")
            .Equal(x => x.Password).WithMessage("Xác nhận mật khẩu không khớp");

        // Rule cho FirstName
        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("Tên không được để trống")
            .MaximumLength(100).WithMessage("Tên không được quá 100 ký tự");

        // Rule cho LastName
        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Họ không được để trống")
            .MaximumLength(100).WithMessage("Họ không được quá 100 ký tự");

        // Rule cho PhoneNumber (optional)
        // Chỉ validate nếu PhoneNumber không rỗng
        RuleFor(x => x.PhoneNumber)
            .MaximumLength(20).WithMessage("Số điện thoại không được quá 20 ký tự")
            .Matches(@"^[\d\-\+\(\)\s]+$").WithMessage("Số điện thoại không đúng định dạng")
            .When(x => !string.IsNullOrEmpty(x.PhoneNumber)); // Chỉ validate nếu có giá trị

        // Rule cho IdentityNumber (optional)
        RuleFor(x => x.IdentityNumber)
            .MaximumLength(50).WithMessage("Số CMND/CCCD không được quá 50 ký tự")
            .When(x => !string.IsNullOrEmpty(x.IdentityNumber)); // Chỉ validate nếu có giá trị
    }
}

/// <summary>
/// Validator cho LoginRequest
/// Validate dữ liệu đầu vào khi đăng nhập
/// </summary>
public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    /// <summary>
    /// Constructor - Định nghĩa các rules validation
    /// </summary>
    public LoginRequestValidator()
    {
        // Rule cho Email
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email không được để trống")
            .EmailAddress().WithMessage("Email không đúng định dạng");

        // Rule cho Password
        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Mật khẩu không được để trống");
    }
}

/// <summary>
/// Validator cho RefreshTokenRequest
/// Validate refresh token khi làm mới access token
/// </summary>
public class RefreshTokenRequestValidator : AbstractValidator<RefreshTokenRequest>
{
    /// <summary>
    /// Constructor - Định nghĩa các rules validation
    /// </summary>
    public RefreshTokenRequestValidator()
    {
        // Rule cho RefreshToken
        RuleFor(x => x.RefreshToken)
            .NotEmpty().WithMessage("Refresh token không được để trống");
    }
}
